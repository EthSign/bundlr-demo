import React, { useEffect, useState, useRef } from "react";
import {
  VStack,
  useDisclosure,
  Button,
  Text,
  HStack,
  Input,
  useToast,
} from "@chakra-ui/react";
import SelectWalletModal from "./Modal";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";

import { useWeb3React } from "@web3-react/core";
import { Tooltip } from "@chakra-ui/react";
import { connectors } from "./connectors";
import { toHex, truncateAddress } from "./utils";
import { WebBundlr } from "@bundlr-network/client";
import { Biconomy } from "@biconomy/mexa";

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { library, chainId, account, activate, deactivate, active } =
    useWeb3React();

  const currency = "matic";
  const [address, setAddress] = useState();
  const [balance, setBalance] = useState();
  const [img, setImg] = useState();
  const [price, setPrice] = useState();
  const [bundler, setBundler] = useState();
  const [bundlerHttpAddress, setBundlerAddress] = useState(
    "https://node1.bundlr.network"
  );

  const [fundAmount, setFundingAmount] = useState();
  const [withdrawAmount, setWithdrawAmount] = useState();

  const toast = useToast();
  const intervalRef = useRef();

  const clean = async () => {
    clearInterval(intervalRef.current);
    setBalance(undefined);
    setImg(undefined);
    setPrice(undefined);
    setBundler(undefined);
    setAddress(undefined);
  };

  const handleFileClick = () => {
    var fileInputEl = document.createElement("input");
    fileInputEl.type = "file";
    fileInputEl.accept = "image/*";
    fileInputEl.style.display = "none";
    document.body.appendChild(fileInputEl);
    fileInputEl.addEventListener("input", function (e) {
      handleUpload(e);
      document.body.removeChild(fileInputEl);
    });
    fileInputEl.click();
  };

  const handleUpload = async (evt) => {
    let files = evt.target.files;
    let reader = new FileReader();
    if (files && files.length > 0) {
      reader.onload = function () {
        if (reader.result) {
          setImg(Buffer.from(reader.result));
        }
      };
      reader.readAsArrayBuffer(files[0]);
    }
  };

  const handlePrice = async () => {
    if (img) {
      const price = await bundler?.utils.getPrice(currency, img.length);
      //@ts-ignore
      setPrice(price?.toString());
    }
  };

  const uploadFile = async () => {
    if (img) {
      await bundler?.uploader
        .upload(img, [{ name: "Content-Type", value: "image/png" }])
        .then((res) => {
          toast({
            status:
              res?.status === 200 || res?.status === 201 ? "success" : "error",
            title:
              res?.status === 200 || res?.status === 201
                ? "Successful!"
                : `Unsuccessful! ${res?.status}`,
            description: res?.data.id
              ? `https://arweave.net/${res.data.id}`
              : undefined,
            duration: 15000,
          });
        })
        .catch((e) => {
          toast({ status: "error", title: `Failed to upload - ${e}` });
        });
    }
  };

  const fund = async () => {
    if (bundler && fundAmount) {
      toast({ status: "info", title: "Funding...", duration: 15000 });
      const value = parseInput(fundAmount);
      if (!value) return;
      await bundler
        .fund(value)
        .then((res) => {
          toast({
            status: "success",
            title: `Funded ${res?.target}`,
            description: ` tx ID : ${res?.id}`,
            duration: 10000,
          });
        })
        .catch((e) => {
          toast({
            status: "error",
            title: `Failed to fund - ${e.data?.message || e.message}`,
          });
        });
    }
  };

  const withdraw = async () => {
    if (bundler && withdrawAmount) {
      toast({ status: "info", title: "Withdrawing..", duration: 15000 });
      const value = parseInput(withdrawAmount);
      if (!value) return;
      await bundler
        .withdrawBalance(value)
        .then((data) => {
          toast({
            status: "success",
            title: `Withdrawal successful - ${data.data?.tx_id}`,
            duration: 5000,
          });
        })
        .catch((err) => {
          toast({
            status: "error",
            title: "Withdrawal Unsuccessful!",
            description: err.message,
            duration: 5000,
          });
        });
    }
  };

  const refreshState = () => {
    window.localStorage.setItem("provider", undefined);
  };

  const disconnect = () => {
    deactivate();
    refreshState();
  };

  useEffect(() => {
    const provider = window.localStorage.getItem("provider");
    if (provider !== "undefined" && chainId) {
      activate(connectors[provider]);
      if (window?.ethereum?.isMetaMask) {
        enableEth();
      }
    }
  }, [chainId]);

  useEffect(() => {
    if (library) {
      const biconomy = new Biconomy(library, {
        apiKey: "tpkapBz2J.18f4ffa5-a0d1-4a64-b65c-bc130b44cd98",
        debug: true,
      });

      library.Web3Provider(biconomy);
    }
  }, [library]);

  const enableEth = async () => {
    await window.ethereum.enable();
    const cId = `0x${chainId.toString(16)}`;
    try {
      // additional logic for requesting a chain switch and conditional chain add.
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: cId }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId,
              rpcUrls: ["https://rpc-mumbai.matic.today"],
              chainName: "Polygon Mainnet",
            },
          ],
        });
      }
    }
  };

  const updateAddress = (evt) => {
    setBundlerAddress(evt.target.value);
  };

  const updateFundAmount = (evt) => {
    setFundingAmount(evt.target.value);
  };

  const updateWithdrawAmount = (evt) => {
    setWithdrawAmount(evt.target.value);
  };

  const initBundlr = async () => {
    const bundlr = new WebBundlr(bundlerHttpAddress, currency, library);
    try {
      // Check for valid bundlr node
      await bundlr.utils.getBundlerAddress(currency);
    } catch {
      toast({
        status: "error",
        title: `Failed to connect to bundlr ${bundlerHttpAddress}`,
        duration: 10000,
      });
      return;
    }
    try {
      await bundlr.ready();
    } catch (err) {
      console.log(err);
    } //@ts-ignore
    if (!bundlr.address) {
      console.log("something went wrong");
    }
    toast({ status: "success", title: `Connected to ${bundlerHttpAddress}` });

    console.log("==== bundlr ====", bundlr);
    setAddress(bundlr?.address);
    setBundler(bundlr);
  };

  const toProperCase = (s) => {
    return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
  };
  const toggleRefresh = async () => {
    if (intervalRef) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(async () => {
      bundler
        ?.getLoadedBalance()
        .then((r) => {
          setBalance(r.toString());
        })
        .catch((_) => clearInterval(intervalRef.current));
    }, 5000);
  };

  // parse decimal input into atomic units
  const parseInput = (input) => {
    const conv = new BigNumber(input).multipliedBy(
      bundler.currencyConfig.base[1]
    );
    if (conv.isLessThan(1)) {
      toast({ status: "error", title: `Value too small!` });
      return;
    }
    return conv;
  };

  return (
    <>
      <VStack mt={10}>
        <Text>{`Account: ${truncateAddress(account)}`}</Text>
        <Text>{`Bundlr Address: ${address}`}</Text>
        <HStack>
          <Button
            w={400}
            disabled={!library || !library.provider}
            onClick={async () => await initBundlr()}
          >
            Connect to Bundlr
          </Button>
          <Input
            value={bundlerHttpAddress}
            onChange={updateAddress}
            placeholder="Bundler Address"
          />
        </HStack>
        {bundler && (
          <>
            <HStack>
              <Button
                onClick={async () => {
                  address &&
                    bundler.getBalance(address).then((res) => {
                      setBalance(res.toString());
                    });
                  await toggleRefresh();
                }}
              >
                Get {toProperCase(currency)} Balance
              </Button>
              {balance && (
                <Tooltip
                  label={`(${balance} ${bundler.currencyConfig.base[0]})`}
                >
                  <Text>
                    {toProperCase(currency)} Balance:{" "}
                    {bundler.utils
                      .unitConverter(balance)
                      .toFixed(7, 2)
                      .toString()}{" "}
                    {bundler.currencyConfig.ticker.toLowerCase()}
                  </Text>
                </Tooltip>
              )}
            </HStack>
            <HStack>
              <Button w={200} onClick={fund}>
                Fund Bundlr
              </Button>
              <Input
                placeholder={`${toProperCase(currency)} Amount`}
                value={fundAmount}
                onChange={updateFundAmount}
              />
            </HStack>
            <HStack>
              <Button w={200} onClick={withdraw}>
                Withdraw Balance
              </Button>
              <Input
                placeholder={`${toProperCase(currency)} Amount`}
                value={withdrawAmount}
                onChange={updateWithdrawAmount}
              />
            </HStack>
            <Button onClick={handleFileClick}>Select file from Device</Button>
            {img && (
              <>
                <HStack>
                  <Button onClick={handlePrice}>Get Price</Button>
                  {price && (
                    <Text>{`Cost: ${bundler.utils
                      .unitConverter(price)
                      .toString()} ${bundler.currencyConfig.ticker.toLowerCase()} `}</Text>
                  )}
                </HStack>
                <Button onClick={uploadFile}>Upload to Bundlr Network</Button>
              </>
            )}
          </>
        )}
      </VStack>
      <VStack justifyContent="center" alignItems="center" h="100vh">
        <HStack>
          {!active ? (
            <Button onClick={onOpen}>Connect Wallet</Button>
          ) : (
            <Button onClick={disconnect}>Disconnect</Button>
          )}
        </HStack>
        <VStack justifyContent="center" alignItems="center" padding="10px 0">
          <HStack>
            <Text>{`Connection Status: `}</Text>
            {active ? (
              <CheckCircleIcon color="green" />
            ) : (
              <WarningIcon color="#cd5700" />
            )}
          </HStack>

          <Tooltip label={account} placement="right">
            <Text>{`Account: ${truncateAddress(account)}`}</Text>
          </Tooltip>
          <Text>{`Network ID: ${chainId ? chainId : "No Network"}`}</Text>
        </VStack>
      </VStack>
      <SelectWalletModal isOpen={isOpen} closeModal={onClose} />
    </>
  );
}
