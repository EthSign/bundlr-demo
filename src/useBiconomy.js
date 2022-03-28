const { Biconomy } = require("@biconomy/mexa");

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import useActiveWeb3React from "./useActiveWeb3React";
import { ethers } from "ethers";

// interface IBiconomyContext {
//   biconomy: undefined | any;
//   isBiconomyReady: boolean;
//   //isGaslessAllowed: boolean;
//   //isGaslessEnabled: boolean;
//   //toggleGasless: () => void;
//   //toggleGaslessStatus: ToggleGaslessStatus;
//   //toggleGaslessError: undefined | Error;
// }

const NETWORK_URL = "https://rpc-mumbai.matic.today";
const API_KEY = "r8mcA2pdo.de088913-20a2-466a-a12e-04cd654d99ec";

const BiconomyContext = createContext(null);

const BiconomyProvider = (props) => {
  const { library } = useActiveWeb3React();

  const [isBiconomyReady, setIsBiconomyReady] = useState(false);

  // reinitialize biconomy everytime library is changed
  const biconomy = useMemo(() => {
    return new Biconomy(new ethers.providers.JsonRpcProvider(NETWORK_URL), {
      apiKey: API_KEY,
      debug: true,
      walletProvider: library?.provider,
    });
  }, [library?.provider]);

  useEffect(() => {
    if (!biconomy) return;

    biconomy
      .onEvent(biconomy.READY, () => {
        // Initialize your dapp here like getting user accounts etc
        setIsBiconomyReady(true);
        console.log("BICONOMY READY");
      })
      .onEvent(biconomy.ERROR, (error, message) => {
        // Handle error while initializing mexa
        console.log(error);
        console.log(message);
        setIsBiconomyReady(false);
      });
  }, [biconomy]);

  return (
    <BiconomyContext.Provider
      value={{
        //toggleGaslessStatus,
        isBiconomyReady,
        //isGaslessAllowed,
        //isGaslessEnabled,
        //toggleGasless,
        biconomy,
        //toggleGaslessError,
      }}
      {...props}
    />
  );
};

const useBiconomy = () => {
  const hookData = useContext(BiconomyContext);
  if (!hookData) throw new Error("Hook used without provider");
  return hookData;
};
export { BiconomyProvider, useBiconomy };
