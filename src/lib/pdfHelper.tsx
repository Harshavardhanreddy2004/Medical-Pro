import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// Define layout styles for a standard 3x7 Avery sticker sheet (21 labels per page)
const styles = StyleSheet.create({
  page: {
    padding: 18,
    backgroundColor: '#ffffff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  sticker: {
    width: '32%', // 3 columns
    height: 105, // 7 rows fits standard A4 height
    margin: '0.6%',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companyName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  qrImage: {
    width: 50,
    height: 50,
  },
  productName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 2,
    height: 16,
    overflow: 'hidden',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 0.3,
    borderTopColor: '#f3f4f6',
    paddingTop: 3,
    marginTop: 2,
  },
  metaText: {
    fontSize: 5.5,
    color: '#6b7280',
    fontFamily: 'Courier',
  },
});

interface StickerData {
  qrDataUrl: string;
  name: string;
  sku: string;
  batchNumber: string;
}

interface LabelSheetPDFProps {
  stickers: StickerData[];
}

export const LabelSheetPDF: React.FC<LabelSheetPDFProps> = ({ stickers }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.grid}>
          {stickers.map((sticker, idx) => (
            <View key={idx} style={styles.sticker}>
              {/* Header company identifier */}
              <Text style={styles.companyName}>MediStock Pro</Text>
              
              {/* QR Code image source */}
              {sticker.qrDataUrl && (
                <Image style={styles.qrImage} src={sticker.qrDataUrl} />
              )}
              
              {/* Truncated product label */}
              <Text style={styles.productName}>
                {sticker.name.length > 30 ? sticker.name.substring(0, 27) + '...' : sticker.name}
              </Text>
              
              {/* Identifiers at bottom */}
              <View style={styles.metaContainer}>
                <Text style={styles.metaText}>SKU: {sticker.sku}</Text>
                <Text style={styles.metaText}>Batch: {sticker.batchNumber}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};
