import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/hooks/use-auth';
import { UsageProvider } from '@/hooks/use-usage-tracking';


export const metadata: Metadata = {
  title: 'Worksheet Wizard',
  description: 'Generate customized mathematics worksheets for students and teachers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen">
       
          <AuthProvider>
            <UsageProvider>
              {children}
            </UsageProvider>
          </AuthProvider>
        
        <Toaster />
      </body>
    </html>
  );
}
