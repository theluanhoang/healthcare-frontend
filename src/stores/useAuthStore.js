import { create } from "zustand";

export const useAuthStore = create((set) => ({
  walletAddress: null,
  role: null, // 'patient' | 'doctor' | 'admin'
  setWallet: (address) => set({ walletAddress: address }),
  setRole: (role) => set({ role }),
  logout: () => set({ walletAddress: null, role: null }),
}));
