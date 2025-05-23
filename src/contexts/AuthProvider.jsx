import { createContext, useCallback, useEffect, useState } from "react";
import { useSmartContract } from "../hooks";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { connectWallet, getUser, disconnectWallet, contract } =
    useSmartContract();
  const [authState, setAuthState] = useState({
    walletAddress: null,
    role: null,
    isVerified: false,
    fullName: null,
    email: null,
    ipfsHash: null,
    isLogged: false,
  });

  const saveAuthState = (state) => {
    localStorage.setItem("authState", JSON.stringify(state));
    setAuthState(state);
  };

  const login = async () => {
    try {
      const address = await connectWallet();
      console.log("Login address:", address);
      const userData = await getUser(address);
      if (!userData) {
        throw new Error("Không thể lấy thông tin người dùng.");
      }
      const { role, isVerified, fullName, email, ipfsHash } = userData;
      const newAuthState = {
        walletAddress: address,
        role: role.toString(),
        isVerified,
        fullName,
        email,
        ipfsHash,
        isLogged: true,
      };
      if (role === "0") {
        newAuthState.isLogged = false;
      }

      saveAuthState(newAuthState);
      return newAuthState;
    } catch (error) {
      console.log("Lỗi đăng nhập: ", error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    disconnectWallet();
    const newAuthState = {
      walletAddress: null,
      role: null,
      isVerified: false,
      fullName: null,
      email: null,
      ipfsHash: null,
      isLogged: false,
    };
    saveAuthState(newAuthState);
  }, [disconnectWallet]);

  useEffect(() => {
    const storedAuthState = localStorage.getItem("authState");
    if (storedAuthState) {
      const parsedState = JSON.parse(storedAuthState);
      setAuthState(parsedState);

      const verifyUser = async () => {
        try {
          if (!parsedState.walletAddress) {
            throw new Error("Địa chỉ ví không hợp lệ.");
          }
          const userData = await getUser(parsedState.walletAddress);
          if (!userData) {
            throw new Error("Thông tin người dùng không tồn tại.");
          }
          const { role, isVerified, fullName, email, ipfsHash } = userData;
          const updatedState = {
            ...parsedState,
            role: role.toString(),
            isVerified,
            fullName,
            email,
            ipfsHash,
            isLogged: true,
          };
          saveAuthState(updatedState);
        } catch (error) {
          console.error("Không thể xác minh người dùng khi reload:", error);
          if (
            !error.message.includes("Hợp đồng hoặc địa chỉ ví chưa sẵn sàng")
          ) {
            logout();
          }
        }
      };

      if (parsedState.walletAddress && contract) {
        verifyUser();
      }
    }
  }, [getUser, logout, contract]);

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
