import { router, Link } from "expo-router";
import { View, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { useSession } from "@/context";
import { Button, TextInput, Text, useTheme, HelperText } from "react-native-paper";
import ScreenWrapper from "@/components/ScreenWrapper";

export default function ForgotPassword() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { resetPassword } = useSession();

  const handleResetPassword = async () => {
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.log("[handleResetPassword] ==>", err);
      // Map Firebase specific errors to user-friendly messages
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email address.");
      } else {
        setError(err.message || "An error occurred while sending the reset email.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollEnabled variant="auth">
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>Reset Password</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.outline, marginTop: 10, textAlign: 'center', marginHorizontal: 20 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Email"
            placeholder="name@mail.com"
            value={email}
            onChangeText={(text) => { setEmail(text); setError(""); setSuccess(false); }}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            left={<TextInput.Icon icon="email-outline" />}
            error={!!error}
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.helperText}>
              {error}
            </HelperText>
          ) : null}

          {success ? (
            <HelperText type="info" visible={success} style={[styles.helperText, { color: theme.colors.primary }]}>
              Password reset link sent! Check your email.
            </HelperText>
          ) : null}
        </View>

        <Button 
          mode="contained" 
          onPress={handleResetPassword} 
          loading={isLoading}
          disabled={isLoading || success}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Send Reset Link
        </Button>

        <View style={styles.footerContainer}>
          <Link dismissTo href="/(auth)/login" asChild>
            <Pressable style={styles.linkButton}>
              <Text variant="bodyLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Back to Sign In</Text>
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
    padding: 5,
  },
});
