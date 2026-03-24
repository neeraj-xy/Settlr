import { router, Link } from "expo-router";
import { View, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { useSession } from "@/context";
import { Button, TextInput, Text, useTheme, HelperText } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";

export default function Login() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn } = useSession();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    try {
      const resp = await signIn(email, password);
      // If user returned successfully, redirect
      if (resp) {
        router.replace("/(app)");
      } else {
        // Since signIn handles its own catch but returns undefined
        setError("Invalid email or password.");
      }
    } catch (err: any) {
      console.log("[handleLogin] ==>", err);
      setError(err.message || "An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollEnabled contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContainer}>
        <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>Welcome Back</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.outline, marginTop: 10 }}>Please sign in to continue</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          mode="outlined"
          label="Email"
          placeholder="name@mail.com"
          value={email}
          onChangeText={(text) => { setEmail(text); setError(""); }}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          left={<TextInput.Icon icon="email-outline" />}
          error={!!error}
        />

        <TextInput
          mode="outlined"
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={(text) => { setPassword(text); setError(""); }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          style={styles.input}
          right={
            <TextInput.Icon 
              icon={showPassword ? "eye-off" : "eye"} 
              onPress={() => setShowPassword(!showPassword)} 
            />
          }
          left={<TextInput.Icon icon="lock-outline" />}
          error={!!error}
        />

        {error ? (
          <HelperText type="error" visible={!!error} style={styles.helperText}>
            {error}
          </HelperText>
        ) : null}
      </View>

      <Button 
        mode="contained" 
        onPress={handleLogin} 
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Sign In
      </Button>

      <View style={styles.footerContainer}>
        <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>Don't have an account?</Text>
        <Link dismissTo href="/(auth)/register" asChild>
          <Pressable style={styles.linkButton}>
            <Text variant="bodyLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign Up</Text>
          </Pressable>
        </Link>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 350,
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  helperText: {
    paddingHorizontal: 0,
    marginBottom: 10,
    fontSize: 14,
  },
  button: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 35,
  },
  linkButton: {
    marginLeft: 5,
    padding: 5,
  },
});
