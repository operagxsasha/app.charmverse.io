import styled from '@emotion/styled';
import { Alert, Card, Stack, SvgIcon, Tooltip, Typography } from '@mui/material';
import type { User } from '@prisma/client';
import { injected, walletConnect, walletLink } from 'connectors';
import type { ReactNode } from 'react';
import { useContext, useState } from 'react';

import charmClient from 'charmClient';
import { Web3Connection } from 'components/_app/Web3ConnectionManager';
import Button from 'components/common/Button';
import { useGoogleAuth } from 'components/login/hooks/useGoogleAuth';
import { WalletConnect } from 'components/login/WalletConnect';
import { useUser } from 'hooks/useUser';
import { useWeb3AuthSig } from 'hooks/useWeb3AuthSig';
import type { LoggedInUser } from 'models';
import type { TelegramAccount } from 'pages/api/telegram/connect';
import DiscordIcon from 'public/images/discord_logo.svg';
import GoogleIcon from 'public/images/Google_G.png';
import TelegramIcon from 'public/images/telegram_logo.svg';

import { DiscordProvider } from './DiscordProvider';
import TelegramLoginIframe, { loginWithTelegram } from './TelegramLoginIframe';

const StyledButton = styled(Button)`
  width: 140px;
`;

const ImageIcon = styled.img`
  height: 48px;
  width: auto;
`;

const GridContainer = styled.div`
  gap: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`;

function ProviderRow({ children }: { children: ReactNode }) {
  return (
    <Card sx={{ height: '100%' }}>
      <Stack direction='column' alignItems='center' justifyContent='space-between' spacing={3} my={3}>
        {children}
      </Stack>
    </Card>
  );
}

export default function IdentityProviders() {
  const { account, connector, connectWallet } = useWeb3AuthSig();
  const { user, setUser } = useUser();
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false);
  const { connectGoogleAccount, disconnectGoogleAccount, isConnectingGoogle } = useGoogleAuth();
  const [isLoggingOut] = useState(false);
  const [telegramError, setTelegramError] = useState('');

  const connectedWithTelegram = Boolean(user?.telegramUser);
  const connectedWithGoogle = !!user?.googleAccounts.length;

  function connectorName(c: any) {
    switch (c) {
      case injected:
        return 'MetaMask';
      case walletConnect:
        return 'WalletConnect';
      case walletLink:
        return 'Coinbase Wallet';
      default:
        return 'Wallet';
    }
  }

  async function disconnectFromTelegram() {
    if (connectedWithTelegram) {
      setIsConnectingTelegram(true);
      try {
        const updatedUser: User = await charmClient.disconnectTelegram();
        setUser((_user: LoggedInUser) => ({ ..._user, ...updatedUser, telegramUser: null }));
      } catch (err: any) {
        setTelegramError(err.message || err.error || 'Something went wrong. Please try again');
      }
      setIsConnectingTelegram(false);
    }
  }

  function connectToTelegram() {
    loginWithTelegram(async (telegramAccount: TelegramAccount) => {
      setIsConnectingTelegram(true);
      if (telegramAccount) {
        try {
          const telegramUser = await charmClient.connectTelegram(telegramAccount);
          setUser((_user: LoggedInUser) => ({ ..._user, telegramUser }));
        } catch (err: any) {
          setTelegramError(err.message || err.error || 'Something went wrong. Please try again');
        }
      } else {
        setTelegramError('Something went wrong. Please try again');
      }
      setIsConnectingTelegram(false);
    });
  }

  return (
    <GridContainer>
      <ProviderRow>
        <ImageIcon src='/images/walletLogos/metamask.png' />
        <Typography color='secondary' variant='button'>
          {user && user.wallets.length > 0 ? `Connected with ${connectorName(connector)}` : 'Connect your wallet'}
        </Typography>
        <WalletConnect onSuccess={() => null} />
      </ProviderRow>

      <DiscordProvider>
        {({ isConnected, isLoading, connect, error }) => (
          <ProviderRow>
            <SvgIcon sx={{ color: '#5765f2', height: 48, width: 'auto' }}>
              <DiscordIcon />
            </SvgIcon>
            <Typography color='secondary' variant='button'>
              {isConnected ? 'Connected with Discord' : 'Connect with Discord'}
            </Typography>
            <Tooltip
              arrow
              placement='top'
              title={
                user?.wallets.length === 0 ? 'You must have at least one wallet address to disconnect from discord' : ''
              }
            >
              {/** div is used to make sure the tooltip is rendered as disabled button doesn't allow tooltip */}
              <div>
                <StyledButton
                  variant='outlined'
                  color={isConnected ? 'error' : 'primary'}
                  disabled={isLoggingOut || isLoading || user?.wallets.length === 0}
                  onClick={connect}
                  loading={isLoading}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </StyledButton>
              </div>
            </Tooltip>

            {error && <Alert severity='error'>{error}</Alert>}
          </ProviderRow>
        )}
      </DiscordProvider>

      <ProviderRow>
        <SvgIcon sx={{ height: 48, width: 'auto' }}>
          <TelegramIcon />
        </SvgIcon>
        <Typography color='secondary' variant='button'>
          {connectedWithTelegram ? 'Connected with Telegram' : 'Connect with Telegram'}
        </Typography>
        <StyledButton
          variant='outlined'
          sx={{ overflow: 'hidden' }}
          color={connectedWithTelegram ? 'error' : 'primary'}
          disabled={isLoggingOut || isConnectingTelegram}
          loading={isConnectingTelegram}
          onClick={() => (connectedWithTelegram ? disconnectFromTelegram() : connectToTelegram())}
        >
          {connectedWithTelegram ? 'Disconnect' : 'Connect'}
        </StyledButton>
        <TelegramLoginIframe />

        {telegramError && <Alert severity='error'>{telegramError}</Alert>}
      </ProviderRow>
      <ProviderRow>
        <img src='images/Google_G.png' height={48} width='auto' />
        <Typography color='secondary' variant='button'>
          {connectedWithGoogle ? 'Connected with Google' : 'Connect with Google'}
        </Typography>
        <StyledButton
          variant='outlined'
          sx={{ overflow: 'hidden' }}
          color={connectedWithGoogle ? 'error' : 'primary'}
          disabled={isLoggingOut || isConnectingGoogle}
          loading={isConnectingGoogle}
          onClick={connectedWithGoogle ? disconnectGoogleAccount : connectGoogleAccount}
        >
          {connectedWithGoogle ? 'Disconnect' : 'Connect'}
        </StyledButton>
        <TelegramLoginIframe />

        {telegramError && <Alert severity='error'>{telegramError}</Alert>}
      </ProviderRow>
    </GridContainer>
  );
}
