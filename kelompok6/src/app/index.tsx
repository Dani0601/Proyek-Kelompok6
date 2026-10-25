import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const DURATION_LOGO    = 800;   // fade+scale logo
const DURATION_TAGLINE = 500;   // fade tagline
const DURATION_BAR     = 1400;  // loading bar fill
const HOLD             = 400;   // jeda sebelum navigasi

export default function SplashScreen() {
  const router = useRouter();

  // animated values
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.6)).current;
  const taglineOp     = useRef(new Animated.Value(0)).current;
  const barWidth      = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo muncul (fade + scale)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: DURATION_LOGO,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),

      // 2. Tagline muncul
      Animated.timing(taglineOp, {
        toValue: 1,
        duration: DURATION_TAGLINE,
        useNativeDriver: true,
      }),

      // 3. Loading bar mengisi
      Animated.timing(barWidth, {
        toValue: width - 80,
        duration: DURATION_BAR,
        useNativeDriver: false, // width tidak bisa useNativeDriver
      }),

      // 4. Jeda singkat
      Animated.delay(HOLD),

      // 5. Fade out seluruh splash
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace('/login');
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar style="light" />

      {/* Logo area */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="cafe" size={52} color="#FFFFFF" />
        </View>
        <Text style={styles.brand}>Sticky Milk</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOp }]}>
        Fresh Drinks, Happy Moments ✨
      </Animated.Text>

      {/* Loading bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      <Animated.Text style={[styles.loadingText, { opacity: taglineOp }]}>
        Memuat aplikasi...
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5C3317',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  /* logo */
  logoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },

  /* tagline */
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 48,
    letterSpacing: 0.3,
  },

  /* loading bar */
  barTrack: {
    width: width - 80,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#E8B84B',
  },

  loadingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
});
