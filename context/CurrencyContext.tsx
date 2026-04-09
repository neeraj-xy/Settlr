import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/context";
import { db } from "@/config/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

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
  const { user, profile } = useSession();
  const [currencySymbol, setCurrencySymbolState] = useState<CurrencySymbol>("$");

  // Load from local storage initially
  useEffect(() => {
    AsyncStorage.getItem("preferredCurrency").then((savedSymbol) => {
      if (savedSymbol) {
        setCurrencySymbolState(savedSymbol as CurrencySymbol);
      }
    });
  }, []);

  // Overwrite local state if cloud profile has a different preference
  useEffect(() => {
    if (profile?.preferredCurrency && profile.preferredCurrency !== currencySymbol) {
      setCurrencySymbolState(profile.preferredCurrency as CurrencySymbol);
      AsyncStorage.setItem("preferredCurrency", profile.preferredCurrency);
    }
  }, [profile?.preferredCurrency]);

  const setCurrencySymbol = async (symbol: CurrencySymbol) => {
    setCurrencySymbolState(symbol);
    await AsyncStorage.setItem("preferredCurrency", symbol);

    // Sync to Firebase if user is logged in
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { preferredCurrency: symbol });
      } catch (error) {
        console.warn("[Currency Sync Error]:", error);
      }
    }
  };

  return (
    <CurrencyContext.Provider value={{ currencySymbol, setCurrencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrencyContext = () => useContext(CurrencyContext);
