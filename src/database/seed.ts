import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Food', icon: 'fast-food', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_travel', name: 'Travel', icon: 'car', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_shopping', name: 'Shopping', icon: 'cart', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_bills', name: 'Bills', icon: 'receipt', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'game-controller', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_health', name: 'Health', icon: 'heart', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_education', name: 'Education', icon: 'school', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_rent', name: 'Rent', icon: 'home', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_recharge', name: 'Recharge', icon: 'phone-portrait', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_groceries', name: 'Groceries', icon: 'basket', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_personal', name: 'Personal', icon: 'person', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cat_other', name: 'Other', icon: 'ellipsis-horizontal', isDefault: true, createdAt: new Date().toISOString() },
];
