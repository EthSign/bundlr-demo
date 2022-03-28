import { useEffect, useState, useRef } from "react";
import { useWeb3React } from "@web3-react/core";

/**
 * Provides a web3 provider with or without user's signer
 * Recreate web3 instance only if the provider change
 */
const useActiveWeb3React = () => {
  const { library, chainId, ...web3React } = useWeb3React();
  const refEth = useRef(library);
  const [provider, setProvider] = useState(library);

  useEffect(() => {
    if (library !== refEth.current) {
      setProvider(library);
      refEth.current = library;
    }
  }, [library]);

  return {
    library: provider,
    chainId: chainId ?? parseInt(137, 10),
    ...web3React,
  };
};

export default useActiveWeb3React;
