import { useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import PageTemplate from '@/components/templates/PageTemplate';
import { DesignTokens } from '@/constants/design-tokens';
import { useKeranjang } from '@/context/keranjang-context';
import { formatRupiah } from '@/context/produk-context';
import { formatTanggal } from '@/utils/detail-transaksi';

const C = DesignTokens.color;

const FONTS = {
  heading: 'Poppins_700Bold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

const KE_ANTREAN = '/(kasir)/kasir';

// warna badge "Selesai" dari desain SVG (belum ada di design-tokens)
const SELESAI = { bg: 'rgba(92, 119, 98, 0.14)', teks: '#5C7762' };

function BarisInfo({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

export default function DetailTransaksiScreen() {
  const router = useRouter();
  const { id, kembali } = useLocalSearchParams<{ id?: string; kembali?: string }>();
  const { cariDetail } = useKeranjang();
  const [fontsLoaded] = useFonts({ Poppins_700Bold, Nunito_400Regular, Nunito_700Bold });

  const [cetakSelesai, setCetakSelesai] = useState(false);

  const detail = id ? cariDetail(id) : undefined;

  // tombol kembali: ke halaman asal bila ada (mis. Riwayat), default ke Antrean
  const keAsal = () => router.navigate((kembali || KE_ANTREAN) as Href);

  // Sementara hanya simulasi (printer belum terhubung): tampilkan modal berhasil
  const handleCetak = () => {
    if (!detail) return;
    setCetakSelesai(true);
  };

  // modal ditutup (tombol OK / tombol back Android) -> pindah ke Antrean
  const tutupModal = () => {
    setCetakSelesai(false);
    router.navigate(KE_ANTREAN as Href);
  };

  if (!fontsLoaded) return null;

  return (
    <PageTemplate>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <AppButton onPress={keAsal} accessibilityLabel="Kembali" style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </AppButton>
          <Text style={styles.title}>Detail Transaksi</Text>
        </View>

        {!detail ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Data transaksi tidak ditemukan.</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {/* Info transaksi */}
              <View style={styles.card}>
                <View style={styles.idRow}>
                  <Text style={styles.idText}>{detail.id}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{detail.status}</Text>
                  </View>
                </View>
                <BarisInfo label="Tanggal" value={formatTanggal(detail.waktu)} bold />
                <BarisInfo label="Kasir" value={detail.kasir} bold />
                <BarisInfo label="Metode bayar" value={detail.metode} bold />
              </View>

              {/* Item pesanan */}
              <Text style={styles.sectionTitle}>Item pesanan</Text>
              <View style={styles.card}>
                {detail.items.map((it, i) => (
                  <View key={`${it.nama}-${i}`} style={[styles.itemRow, i > 0 && styles.itemRowGap]}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{it.nama}</Text>
                      <Text style={styles.itemSub}>{it.qty} × {formatRupiah(it.harga)}</Text>
                    </View>
                    <Text style={styles.itemTotal}>{formatRupiah(it.qty * it.harga)}</Text>
                  </View>
                ))}
              </View>

              {/* Ringkasan pembayaran */}
              <View style={[styles.card, styles.summaryCard]}>
                <BarisInfo label="Subtotal" value={formatRupiah(detail.subtotal)} />
                {detail.metode === 'Tunai' && (
                  <>
                    <BarisInfo label="Uang diterima" value={formatRupiah(detail.uangDiterima)} />
                    <BarisInfo label="Kembalian" value={formatRupiah(detail.kembalian)} />
                  </>
                )}
                <View style={styles.divider} />
                <View style={[styles.row, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatRupiah(detail.total)}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Tombol cetak struk */}
            <View style={styles.footer}>
              <AppButton onPress={handleCetak} accessibilityLabel="Cetak struk" style={styles.printBtn}>
                <Ionicons name="print-outline" size={24} color={C.white} />
                <Text style={styles.printText}>Cetak Struk</Text>
              </AppButton>
            </View>
          </>
        )}
      </SafeAreaView>

      {/* Modal struk berhasil dicetak */}
      <Modal visible={cetakSelesai} transparent animationType="fade" onRequestClose={tutupModal}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons name="checkmark" size={26} color={SELESAI.teks} />
            </View>
            <Text style={styles.dialogTitle}>Struk {detail?.id} berhasil dicetak</Text>
            <AppButton
              onPress={tutupModal}
              accessibilityLabel="OK"
              style={styles.dialogBtn}
              textStyle={styles.dialogBtnText}
            >
              OK
            </AppButton>
          </View>
        </View>
      </Modal>
    </PageTemplate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 16 },
  backBtn: { width: 40, height: 40, borderRadius: DesignTokens.radius.pill, backgroundColor: C.surface },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: C.text },

  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 16 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingHorizontal: 19,
    paddingVertical: 14,
  },

  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  idText: { fontFamily: FONTS.heading, fontSize: 22, color: C.text },
  badge: { backgroundColor: SELESAI.bg, borderRadius: DesignTokens.radius.pill, paddingHorizontal: 14, paddingVertical: 3 },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: SELESAI.teks },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, marginBottom: 2 },
  rowLabel: { fontFamily: FONTS.body, fontSize: 15, color: C.textMuted },
  rowValue: { fontFamily: FONTS.body, fontSize: 15, color: C.text },
  rowValueBold: { fontFamily: FONTS.bodyBold },

  sectionTitle: { fontFamily: FONTS.heading, fontSize: 17, color: C.text, marginTop: 22, marginBottom: 10 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemRowGap: { marginTop: 14 },
  itemInfo: { flex: 1, paddingRight: 8 },
  itemName: { fontFamily: FONTS.bodyBold, fontSize: 15, color: C.text },
  itemSub: { fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginTop: 2 },
  itemTotal: { fontFamily: FONTS.bodyBold, fontSize: 15, color: C.text },

  summaryCard: { marginTop: 16 },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.border, marginVertical: 10 },
  totalRow: { marginBottom: 0, alignItems: 'baseline' },
  totalLabel: { fontFamily: FONTS.heading, fontSize: 17, color: C.text },
  totalValue: { fontFamily: FONTS.heading, fontSize: 23, color: C.primary },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: C.textMuted },

  footer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12 },
  printBtn: { flexDirection: 'row', gap: 14, height: 50, borderRadius: 25, backgroundColor: C.primary },
  printText: { fontFamily: FONTS.heading, fontSize: 16, color: C.white },

  /* modal (gaya sama dengan dialog konfirmasi di produk.tsx) */
  dialogOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    backgroundColor: C.background,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SELESAI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: C.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  dialogBtn: {
    alignSelf: 'stretch',
    height: 44,
    borderRadius: DesignTokens.radius.pill,
    backgroundColor: C.primary,
  },
  dialogBtnText: { fontFamily: FONTS.heading, fontSize: 15, color: C.white },
});