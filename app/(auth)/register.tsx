import { router, Link } from "expo-router";
import { View, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { useSession } from "@/context";
import { Button, TextInput, Text, useTheme, HelperText } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";

export default function Register() {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp } = useSession();

  const validateInputs = () => {
    if (!name.trim()) return "Please enter your full name.";
    
    // Simple robust email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/\d/.test(password)) return "Password must contain at least one number.";
    if (password !== confirmPassword) return "Passwords do not match.";
    
    return null;
  };

  const handleRegister = async () => {
    setError("");
    
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    try {
      const resp = await signUp(email, password, name);
      if (resp) {
        router.replace("/(app)/dashboard");
      } else {
        setError("Error creating account. Email might already be in use.");
      }
    } catch (err: any) {
      console.log("[handleRegister] ==>", err);
      // Firebase specific error codes
      if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already registered.");
      } else {
        setError(err.message || "An error occurred during registration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollEnabled variant="auth">
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>Create Account</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.outline, marginTop: 10 }}>Sign up to get started</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={(text) => { setName(text); setError(""); }}
            autoCapitalize="words"
            textContentType="name"
            style={styles.input}
            left={<TextInput.Icon icon="account-outline" />}
            error={!!error && error.includes("name")}
          />

          <TextInput
            mode="outlined"
            label="Email"
            placeholder="name@mail.com"
            value={email}
            onChangeText={(text) => { setEmail(text); setError(""); }}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
            left={<TextInput.Icon icon="email-outline" />}
            error={!!error && error.includes("email")}
          />

          <TextInput
            mode="outlined"
            label="Password"
            placeholder="Create a strong password"
            value={password}
            onChangeText={(text) => { setPassword(text); setError(""); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            style={styles.input}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)} 
              />
            }
            left={<TextInput.Icon icon="lock-outline" />}
            error={!!error && error.includes("Password")}
          />

          <TextInput
            mode="outlined"
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={(text) => { setConfirmPassword(text); setError(""); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            style={styles.input}
            left={<TextInput.Icon icon="lock-check-outline" />}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)} 
              />
            }
            error={!!error && error.includes("match")}
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.helperText}>
              {error}
            </HelperText>
          ) : null}
        </View>

        <Button 
          mode="contained" 
          onPress={handleRegister} 
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Sign Up
        </Button>

        <View style={styles.footerContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>Already have an account?</Text>
          <Link dismissTo href="/(auth)/login" asChild>
            <Pressable style={styles.linkButton}>
              <Text variant="bodyLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
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
    marginBottom: 10,
  },
  input: {
    marginBottom: 16,
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
