import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CameraDeniedSheet from "@/components/CameraDeniedSheet";
import { AuthedImage, Button, Field, Icon, Sheet, Spinner } from "@/components/ui";
import { fonts, maxScale, spacing, type } from "@/constants/theme";
import { useGlobalContext } from "@/context/GlobalProvider";
import { changeProfilePhoto, removeProfilePhoto, saveProfileDetails } from "@/lib/profileEdits";
import { initialOf, profilePhoto } from "@/utils/account";
import { showDialog } from "@/utils/dialog";
import { PhotoSource, pickProfilePhoto } from "@/utils/photo";
import { cleanName, nameError } from "@/utils/profile";
import { cleanUpiId, MAX_UPI_ID, upiIdError } from "@/utils/upi";
import { showToast } from "@/utils/toast";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const AVATAR = 112;

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/profile");
};

/**
 * Edit profile, opened from Account: change or remove the profile picture,
 * change the name, and enter your own UPI ID. A picture is changed the moment
 * it is chosen (it is uploaded and saved, with a message); the name and the UPI
 * ID are saved together with Save. The name is the app's: the person's Google
 * account is not changed. The UPI ID is optional and is the person's own: it is
 * added to the rent reminders they send, only when they have entered one.
 */
const EditProfile = () => {
  const colors = useColors();
  const styles = useStyles();
  const { user, setUser } = useGlobalContext();
  const [name, setName] = useState<string>(user?.username ?? "");
  const [upi, setUpi] = useState<string>(user?.upi_id ?? "");
  const [error, setError] = useState("");
  const [upiError, setUpiError] = useState("");
  const [busy, setBusy] = useState<"photo" | "name" | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  // The picture that couldn't be loaded, so the letter shows instead of an empty circle
  const [brokenPhoto, setBrokenPhoto] = useState<string | null>(null);
  const nameField = useRef<TextInput>(null);
  const upiField = useRef<TextInput>(null);

  const avatar = profilePhoto(user?.avatar);
  const photo = avatar && avatar !== brokenPhoto ? avatar : null;
  const nameChanged = cleanName(name) !== (user?.username ?? "");
  const upiChanged = cleanUpiId(upi) !== cleanUpiId(user?.upi_id ?? "");
  const changed = nameChanged || upiChanged;
  const working = busy !== null;

  const choose = async (source: PhotoSource) => {
    setChoosing(false);
    if (!user) return;
    let denied = false;
    let picked;
    try {
      picked = await pickProfilePhoto(source, () => {
        denied = true;
      });
    } catch {
      showToast("Couldn’t open your photos. Please try again.", { variant: "error" });
      return;
    }
    if (denied) {
      setCameraDenied(true);
      return;
    }
    if (!picked) return;

    setBusy("photo");
    try {
      setUser(await changeProfilePhoto(user, picked));
      showToast("Photo updated", { variant: "success" });
    } catch {
      showToast("Couldn’t save your photo. Check your connection and try again.", {
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!user) return;
    setBusy("photo");
    try {
      setUser(await removeProfilePhoto(user));
      showToast("Photo removed", { variant: "success" });
    } catch {
      showToast("Couldn’t remove your photo. Check your connection and try again.", {
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const confirmRemove = () =>
    showDialog({
      title: "Remove your photo?",
      message: "Your letter will show instead. You can add a photo again whenever you like.",
      actions: [
        { label: "Remove", tone: "destructive", onPress: remove },
        { label: "Cancel", onPress: () => {} },
      ],
    });

  const saveDetails = async () => {
    if (!user) return;
    const found = nameError(name);
    const foundUpi = upiIdError(upi);
    setError(found);
    setUpiError(foundUpi);
    if (found) {
      nameField.current?.focus();
      return;
    }
    if (foundUpi) {
      upiField.current?.focus();
      return;
    }
    if (!changed) return;

    setBusy("name");
    try {
      setUser(
        await saveProfileDetails(user, {
          ...(nameChanged ? { name } : {}),
          ...(upiChanged ? { upiId: upi } : {}),
        })
      );
      showToast(
        nameChanged && upiChanged
          ? "Profile updated"
          : nameChanged
            ? "Name updated"
            : cleanUpiId(upi)
              ? "UPI ID saved"
              : "UPI ID removed",
        { variant: "success" }
      );
      goBack();
    } catch {
      showToast(
        `Couldn’t save your ${
          nameChanged && upiChanged ? "details" : nameChanged ? "name" : "UPI ID"
        }. Check your connection and try again.`,
        { variant: "error" }
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.page}
      >
        <View style={styles.bar}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.back}
          >
            <Icon name="chevronLeft" size={24} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={styles.title}
            accessibilityRole="header"
            maxFontSizeMultiplier={maxScale.title}
          >
            Edit profile
          </Text>

          <View style={styles.photoBlock}>
            <View style={styles.avatar}>
              {photo ? (
                <AuthedImage
                  uri={photo}
                  // The initial shows for the moment the photo's token takes to arrive
                  fallback={<Text style={styles.initial}>{initialOf(name.trim() || user?.username, user?.email)}</Text>}
                  style={styles.photo}
                  contentFit="cover"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  onError={() => setBrokenPhoto(photo)}
                />
              ) : (
                <Text style={styles.initial}>{initialOf(name.trim() || user?.username, user?.email)}</Text>
              )}
              {busy === "photo" && (
                <View style={styles.busy}>
                  <Spinner size={32} accessibilityLabel="Saving your photo" />
                </View>
              )}
            </View>

            <View style={styles.photoButtons}>
              <Button
                title="Change photo"
                variant="outline"
                size="compact"
                disabled={working}
                onPress={() => setChoosing(true)}
                style={styles.photoButton}
              />
              {!!photo && (
                <Button
                  title="Remove photo"
                  variant="text"
                  size="compact"
                  disabled={working}
                  onPress={confirmRemove}
                  style={styles.photoButton}
                />
              )}
            </View>
          </View>

          <Field
            ref={nameField}
            label="Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError("");
            }}
            onBlur={() => setError(nameError(name))}
            error={error}
            disabled={working}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
            onSubmitEditing={saveDetails}
          />
          <Text style={styles.hint}>
            This is the name Pianoverse shows on Account. Your Google account isn’t changed.
          </Text>

          <Field
            ref={upiField}
            label="UPI ID (optional)"
            value={upi}
            onChangeText={(text) => {
              setUpi(text);
              if (upiError) setUpiError("");
            }}
            onBlur={() => setUpiError(upiIdError(upi))}
            error={upiError}
            disabled={working}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={MAX_UPI_ID}
            returnKeyType="done"
            onSubmitEditing={saveDetails}
            style={styles.upi}
          />
          <Text style={styles.hint}>
            Your own, like name@bank. It goes at the end of a rent reminder when rent is due, so the renter knows where
            to pay. Leave it empty to leave it out.
          </Text>

          <Button
            title="Save"
            loading={busy === "name"}
            loadingTitle="Saving"
            disabled={!changed || busy === "photo"}
            onPress={saveDetails}
            style={styles.save}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={choosing} onClose={() => setChoosing(false)} title="Profile photo" tone="white">
        <View>
          {[
            { label: "Take a photo", source: "camera" as const },
            { label: "Choose from gallery", source: "library" as const },
          ].map((option) => (
            <Pressable
              key={option.source}
              onPress={() => choose(option.source)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <CameraDeniedSheet
        visible={cameraDenied}
        message="Allow camera access in Settings to take a profile photo. You can also choose one from your gallery."
        onClose={() => setCameraDenied(false)}
        onChooseFromGallery={() => {
          setCameraDenied(false);
          choose("library");
        }}
      />
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.page },
  bar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  title: { ...type.largeTitle, paddingTop: spacing.sm, color: colors.ink },
  photoBlock: { alignItems: "center", paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.brand,
  },
  photo: { width: AVATAR, height: AVATAR },
  initial: { fontFamily: fonts.bold, fontSize: 44, color: colors.onBrand },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.veil,
  },
  photoButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  photoButton: { paddingHorizontal: spacing.lg },
  hint: { ...type.caption, marginTop: spacing.sm, fontFamily: fonts.regular, color: colors.ink2 },
  upi: { marginTop: spacing.xl },
  save: { marginTop: spacing.xxl },
  option: {
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  optionPressed: { backgroundColor: colors.grouped },
  optionLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
}));

export default EditProfile;
