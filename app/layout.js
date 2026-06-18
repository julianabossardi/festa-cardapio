export const metadata = {
    title: 'Cardapio da Festa - Bra x Haiti',
    description: 'Escolha o que voce vai trazer pra festa junina copa edition!',
}

export default function RootLayout({ children }) {
    return (
          <html lang="pt-BR">
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <link rel="preconnect" href="https://fonts.googleapis.com" />
              <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
        <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', system-ui, sans-serif", background: '#f0f2f5' }}>
{children}
</body>
  </html>
  )
}
