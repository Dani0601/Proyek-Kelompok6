import { Redirect } from 'expo-router';

// Alamat balik dari login Google. Token dibaca oleh auth-context, jadi layar ini
// cukup mengembalikan pengguna ke "/" (index mengarahkan sesuai sesi).
export default function AuthCallback() {
  return <Redirect href="/" />;
}