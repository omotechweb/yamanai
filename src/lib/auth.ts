import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  // JWT tabanli oturum (veritabani gerekmez, istege gore degistirilebilir)
  session: { strategy: 'jwt' },

  callbacks: {
    // JWT'ye kullanici verisini ekle
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider  = account.provider;
        token.accountId = account.providerAccountId;

        // Her provider farkli alan adi kullanir
        const p = profile as { picture?: string; avatar_url?: string };
        token.avatarUrl = p.picture ?? p.avatar_url ?? null;
      }
      return token;
    },

    // Session nesnesine JWT'den veri aktar (client tarafinda eriselebilir)
    async session({ session, token }) {
      if (session.user) {
        Object.assign(session.user, {
          provider:  token.provider,
          accountId: token.accountId,
          avatarUrl: token.avatarUrl,
        });
      }
      return session;
    },

    // Giris sonrasi yonlendirme
    async redirect({ baseUrl }) {
      return baseUrl + '/'; // her zaman ana sayfaya don
    },
  },

  pages: {
    signIn: '/giris', // ozel giris sayfamiz
    error:  '/giris', // hata olursa giris sayfasina don
  },

  secret: process.env.NEXTAUTH_SECRET,
};
