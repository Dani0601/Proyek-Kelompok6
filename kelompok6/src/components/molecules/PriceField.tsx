import { StyleSheet, Text, TextInput, View } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

type PriceFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholderTextColor?: string;
};

/** Molecule field harga dengan label, awalan Rupiah, dan input angka. */
export default function PriceField({ label, value, onChangeText, placeholderTextColor = DesignTokens.color.textMuted }: PriceFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Text style={styles.prefix}>Rp</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={placeholderTextColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: DesignTokens.spacing.md },
  label: {
    fontFamily: 'Nunito_700Bold', fontSize: DesignTokens.typography.bodySmall,
    color: DesignTokens.color.textMuted, marginBottom: DesignTokens.spacing.xs,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', height: 50,
    backgroundColor: DesignTokens.color.surface, borderRadius: DesignTokens.radius.md,
    borderWidth: 1.5, borderColor: DesignTokens.color.border, paddingHorizontal: 14,
  },
  prefix: {
    fontFamily: 'Nunito_700Bold', fontSize: 15, color: DesignTokens.color.primary, marginRight: 8,
  },
  input: {
    flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15,
    color: DesignTokens.color.textDark, padding: 0,
  },
});
