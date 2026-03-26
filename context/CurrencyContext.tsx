import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CurrencySymbol = "$" | "€" | "£" | "₹" | "¥";

interface CurrencyContextType {
  currencySymbol: CurrencySymbol;
  setCurrencySymbol: (symbol: CurrencySymbol) => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currencySymbol: "$",
  setCurrencySymbol: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencySymbol, setCurrencySymbolState] = useState<CurrencySymbol>("$");

  useEffect(() => {
    AsyncStorage.getItem("preferredCurrency").then((savedSymbol) => {
      if (savedSymbol) {
        setCurrencySymbolState(savedSymbol as CurrencySymbol);
      }
    });
  }, []);

  const setCurrencySymbol = async (symbol: CurrencySymbol) => {
    setCurrencySymbolState(symbol);
    await AsyncStorage.setItem("preferredCurrency", symbol);
  };

  return (
    <CurrencyContext.Provider value={{ currencySymbol, setCurrencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrencyContext = () => useContext(CurrencyContext);
