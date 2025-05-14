import { useContext } from "react";
import { SmartContractContext } from "../contexts";

export const useSmartContract = () => useContext(SmartContractContext);
