/**
 * E-Book Catalog
 * 
 * Hardcoded list of e-books available in the marketplace
 * Prices range from 0.1 to 0.2 USDC
 */

import { EBook } from './types';

export const EBOOK_CATALOG: EBook[] = [
  {
    id: '1',
    title: 'The Art of Programming',
    author: 'John Doe',
    price: 0.15,
    description: 'A comprehensive guide to programming fundamentals and best practices.',
    category: 'Programming',
  },
  {
    id: '2',
    title: 'Web3 Fundamentals',
    author: 'Jane Smith',
    price: 0.12,
    description: 'Learn the basics of Web3, blockchain, and decentralized applications.',
    category: 'Web3',
  },
  {
    id: '3',
    title: 'AI and Machine Learning',
    author: 'Bob Wilson',
    price: 0.18,
    description: 'An introduction to artificial intelligence and machine learning concepts.',
    category: 'AI/ML',
  },
  {
    id: '4',
    title: 'Blockchain Basics',
    author: 'Alice Johnson',
    price: 0.10,
    description: 'Understanding blockchain technology from the ground up.',
    category: 'Blockchain',
  },
  {
    id: '5',
    title: 'Smart Contracts Guide',
    author: 'Charlie Brown',
    price: 0.16,
    description: 'Learn how to write and deploy smart contracts on various blockchains.',
    category: 'Blockchain',
  },
  {
    id: '6',
    title: 'Cryptocurrency Explained',
    author: 'Diana Prince',
    price: 0.14,
    description: 'A beginner-friendly guide to cryptocurrencies and digital assets.',
    category: 'Finance',
  },
  {
    id: '7',
    title: 'DeFi Fundamentals',
    author: 'Edward Norton',
    price: 0.17,
    description: 'Explore decentralized finance protocols and applications.',
    category: 'DeFi',
  },
  {
    id: '8',
    title: 'NFTs and Digital Art',
    author: 'Fiona Apple',
    price: 0.13,
    description: 'Understanding NFTs, digital ownership, and the creator economy.',
    category: 'NFTs',
  },
  {
    id: '9',
    title: 'Ethereum Development',
    author: 'George Lucas',
    price: 0.19,
    description: 'Complete guide to building on the Ethereum blockchain.',
    category: 'Development',
  },
  {
    id: '10',
    title: 'Solidity Programming',
    author: 'Helen Mirren',
    price: 0.15,
    description: 'Master Solidity for Ethereum smart contract development.',
    category: 'Programming',
  },
  {
    id: '11',
    title: 'Cryptography Essentials',
    author: 'Ian McKellen',
    price: 0.11,
    description: 'Learn the cryptographic principles behind blockchain security.',
    category: 'Security',
  },
  {
    id: '12',
    title: 'Tokenomics Design',
    author: 'Julia Roberts',
    price: 0.20,
    description: 'Design effective token economics for your blockchain project.',
    category: 'Economics',
  },
  {
    id: '13',
    title: 'Layer 2 Solutions',
    author: 'Kevin Spacey',
    price: 0.16,
    description: 'Understanding scaling solutions like rollups and sidechains.',
    category: 'Blockchain',
  },
  {
    id: '14',
    title: 'DAO Governance',
    author: 'Laura Linney',
    price: 0.14,
    description: 'How decentralized autonomous organizations work and operate.',
    category: 'Governance',
  },
  {
    id: '15',
    title: 'Web3 Security Best Practices',
    author: 'Michael Caine',
    price: 0.18,
    description: 'Essential security practices for Web3 developers and users.',
    category: 'Security',
  },
  {
    id: '16',
    title: 'Decentralized Storage',
    author: 'Natalie Portman',
    price: 0.12,
    description: 'Exploring IPFS, Arweave, and other decentralized storage solutions.',
    category: 'Infrastructure',
  },
  {
    id: '17',
    title: 'Cross-Chain Bridges',
    author: 'Oscar Isaac',
    price: 0.17,
    description: 'Understanding how assets move between different blockchains.',
    category: 'Blockchain',
  },
  {
    id: '18',
    title: 'Crypto Trading Strategies',
    author: 'Penelope Cruz',
    price: 0.19,
    description: 'Advanced trading strategies for cryptocurrency markets.',
    category: 'Trading',
  },
  {
    id: '19',
    title: 'Staking and Yield Farming',
    author: 'Quentin Tarantino',
    price: 0.15,
    description: 'Maximize returns through staking and yield farming protocols.',
    category: 'DeFi',
  },
  {
    id: '20',
    title: 'Metaverse Development',
    author: 'Rachel Weisz',
    price: 0.13,
    description: 'Building virtual worlds and experiences in the metaverse.',
    category: 'Development',
  },
];

/**
 * Get all e-books
 */
export function getAllEbooks(): EBook[] {
  return EBOOK_CATALOG;
}

/**
 * Find e-book by ID
 */
export function findEbookById(id: string): EBook | undefined {
  return EBOOK_CATALOG.find((ebook) => ebook.id === id);
}

/**
 * Search e-books by title or author
 */
export function searchEbooks(query: string): EBook[] {
  const lowerQuery = query.toLowerCase();
  return EBOOK_CATALOG.filter(
    (ebook) =>
      ebook.title.toLowerCase().includes(lowerQuery) ||
      ebook.author.toLowerCase().includes(lowerQuery) ||
      ebook.description.toLowerCase().includes(lowerQuery) ||
      (ebook.category && ebook.category.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get e-book price by ID
 */
export function getEbookPrice(id: string): number | null {
  const ebook = findEbookById(id);
  return ebook ? ebook.price : null;
}