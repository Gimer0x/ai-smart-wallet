/**
 * Groq AI Agent Setup
 * 
 * Main agent initialization and configuration
 */

import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
import { AgentConfig, PendingAction, PENDING_ACTION_MARKER } from "./types";

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY not set in .env. Agent will not function properly.");
}

/**
 * Initialize Groq Chat Model
 */
export function createGroqModel(temperature: number = 0) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required. Please set it in your .env file.");
  }

  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature,
    apiKey: GROQ_API_KEY,
  });
}

/**
 * System Prompt for the Smart Wallet Agent
 */
const createSystemPrompt = (primaryWalletId?: string) => {
  const walletInfo = primaryWalletId 
    ? `\n\nIMPORTANT: The primary wallet ID is ${primaryWalletId}. When users ask about "which wallet" or "connected wallet", you MUST use the get_wallet_info tool with this wallet ID to get the actual wallet address and details. Always use this wallet ID for balance checks and purchases unless the user specifies otherwise.`
    : '';
  
  return `You are a smart wallet assistant. Users can ask you to purchase e-books from the marketplace, check balances, view transactions, and transfer tokens.

CRITICAL: When users ask you to list, show, or display e-books, you MUST use the browse_ebooks tool immediately. Do NOT just tell them you can list e-books - actually call the tool and display the results.

You have access to the following capabilities:
- Check wallet balance (use check_wallet_balance tool)
- Get wallet information including address (use get_wallet_info tool)
- List transactions with optional filters (use list_transactions tool)
- Get specific transaction details by ID (use get_transaction tool)
- Transfer tokens/USDC to other addresses (use transfer_tokens tool)
- Browse available e-books in the marketplace (use browse_ebooks tool) - USE THIS when asked to list/show e-books
- Search for e-books by title/author (use search_ebooks tool)
- Get e-book price and details (use get_ebook_price tool)
- Purchase e-books using USDC (use purchase_ebook tool)

Important rules:
1. When asked about which wallet you're connected to, ALWAYS use the get_wallet_info tool to get the actual wallet address and return it to the user
2. When checking balance, ALWAYS use the check_wallet_balance tool - never guess or make up balance amounts
3. When listing transactions, use list_transactions tool with appropriate filters if needed
4. When getting transaction details, use get_transaction tool with the transaction ID
5. When users ask to "list e-books", "show e-books", "what e-books are available", or similar requests to see all e-books:
   - IMMEDIATELY use the browse_ebooks tool to get the complete list
   - Display the full list returned by the tool to the user
   - Do NOT just say you can list them - actually call the tool and show the results
6. When users search for specific e-books, use search_ebooks tool with their query
7. When transferring tokens:
   - FIRST check the wallet balance using check_wallet_balance to get the token ID and verify sufficient funds
   - Use the token ID from the balance check in the transfer_tokens tool
   - Verify the destination address is correct before transferring
   - Always confirm the transfer was initiated and provide the transaction ID
8. When purchasing e-books:
   - FIRST browse or search e-books to find what the user wants
   - Get the e-book price using get_ebook_price tool
   - Check wallet balance to get the token ID and verify sufficient funds
   - Use purchase_ebook tool with wallet ID, e-book ID, and token ID
9. Always check the wallet balance before attempting to purchase anything
10. Confirm the price of the e-book before purchasing
11. Only proceed with purchases or transfers if the wallet has sufficient balance
12. Provide clear, friendly responses to users with actual data from the tools
13. Confirm purchases and transfers clearly with transaction details when completed
14. Never hallucinate or make up wallet addresses, balances, transaction details, or e-book lists - always use the tools to get real data${walletInfo}

Be helpful, concise, and always prioritize user safety and wallet security.`;
};


function extractPendingAction(content: string): PendingAction | null {
  const start = content.indexOf(PENDING_ACTION_MARKER);
  if (start === -1) return null;
  const afterStart = content.slice(start + PENDING_ACTION_MARKER.length);
  const end = afterStart.indexOf(PENDING_ACTION_MARKER);
  if (end === -1) return null;
  try {
    const json = afterStart.slice(0, end).trim();
    const parsed = JSON.parse(json) as PendingAction;
    if (parsed.type === "transfer" || parsed.type === "purchase") return parsed;
  } catch {
    // ignore
  }
  return null;
}

export interface ProcessMessageResult {
  response: string;
  pendingAction?: PendingAction;
}

/**
 * Process message with agent executor and tools
 */
export async function processMessage(
  message: string,
  walletId?: string,
  tools: any[] = []
): Promise<ProcessMessageResult> {
  if (!GROQ_API_KEY) {
    return {
      response: "I'm sorry, but the AI agent is not properly configured. Please set GROQ_API_KEY in your .env file.",
    };
  }

  try {
    const model = createGroqModel(0);
    const systemPrompt = createSystemPrompt(walletId);

    // Bind tools to the model
    const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model;

    // Create messages using LangChain message types
    const messages: any[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ];

    // Get initial response
    let response;
    try {
      response = await modelWithTools.invoke(messages);
    } catch (invokeError: any) {
      if (invokeError.error) {
        console.error('   Error details:', JSON.stringify(invokeError.error, null, 2));
      }
      if (invokeError.response) {
        console.error('   Response:', JSON.stringify(invokeError.response, null, 2));
      }
      throw invokeError;
    }
    
    let toolCalls = (response as any).tool_calls || [];
    console.log('🔨 Tool calls detected:', toolCalls.length);
    if (toolCalls.length > 0) {
      console.log('🔨 Tool call details:', toolCalls.map((tc: any) => ({
        name: tc.name,
        id: tc.id,
        args: tc.args,
      })));
    }

    let lastPendingAction: PendingAction | null = null;

    // Execute tool calls if any (max 5 iterations to prevent infinite loops)
    let iterations = 0;
    while (toolCalls && toolCalls.length > 0 && iterations < 5) {
      iterations++;
      console.log(`🔄 Tool execution iteration ${iterations}`);

      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall: any) => {
          console.log(`   🔍 Looking for tool: ${toolCall.name}`);
          const tool = tools.find((t) => t.name === toolCall.name);
          if (!tool) {
            console.error(`   ❌ Tool ${toolCall.name} not found in available tools`);
            console.error(`   📋 Available tools:`, tools.map((t) => t.name));
            return {
              tool_call_id: toolCall.id,
              content: `Tool ${toolCall.name} not found`,
            };
          }
          console.log(`   ✅ Found tool: ${toolCall.name}`);
          console.log(`   📝 Tool call args:`, JSON.stringify(toolCall.args, null, 2));
          try {
            const result = await tool.invoke(toolCall.args);
            console.log(`   ✅ Tool ${toolCall.name} executed successfully`);
            const content = typeof result === 'string' ? result : String(result);
            const pending = extractPendingAction(content);
            if (pending) lastPendingAction = pending;
            return {
              tool_call_id: toolCall.id,
              content,
            };
          } catch (error: any) {
            console.error(`   ❌ Tool ${toolCall.name} execution failed:`, error.message);
            return {
              tool_call_id: toolCall.id,
              content: `Error: ${error.message}`,
            };
          }
        })
      );

      // Add AI response and tool results
      messages.push(response);
      toolResults.forEach((toolResult: any) => {
        messages.push(
          new ToolMessage({
            content: toolResult.content,
            tool_call_id: toolResult.tool_call_id,
          })
        );
      });

      // Get next response
      try {
        response = await modelWithTools.invoke(messages);
        toolCalls = (response as any).tool_calls || [];
        console.log(`   🔄 Next response - tool calls: ${toolCalls?.length || 0}`);
      } catch (nextError: any) {
        console.error('❌ Error in next iteration invoke:');
        console.error('   Error message:', nextError.message);
        console.error('   Error status:', nextError.status);
        if (nextError.error) {
          console.error('   Error details:', JSON.stringify(nextError.error, null, 2));
        }
        throw nextError;
      }
    }

    // Get final content
    const finalContent = (response as AIMessage).content;
    let finalContentStr = typeof finalContent === 'string' ? finalContent : JSON.stringify(finalContent);

    const toolMessages = messages.filter((m: any) => m instanceof ToolMessage);
    const lastToolMessage = toolMessages[toolMessages.length - 1];

    if (lastToolMessage && finalContentStr && !finalContentStr.includes('Available E-Books')) {
      const toolResult = lastToolMessage.content as string;
      if (toolResult.includes('Available E-Books') || toolResult.includes('ebook')) {
        finalContentStr = `${finalContentStr}\n\n${toolResult}`;
      }
    }

    if ((!finalContentStr || finalContentStr.trim() === '') && lastToolMessage) {
      finalContentStr = lastToolMessage.content as string;
    }

    const responseText = finalContentStr || 'I processed your request but did not receive a response.';
    return {
      response: responseText,
      ...(lastPendingAction ? { pendingAction: lastPendingAction } : {}),
    };
  } catch (error: any) {
    console.error("Error processing message:", error);
    return {
      response: `I encountered an error: ${error.message || "Unknown error"}`,
    };
  }
}