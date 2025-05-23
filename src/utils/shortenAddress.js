import { isAddress } from "ethers";

export const shortenAddress = (address, startLength = 6, endLength = 4) => {
  if (!address || typeof address !== "string" || !isAddress(address)) {
    return "Địa chỉ không hợp lệ";
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};