import { GoogleLogin } from '@react-oauth/google';
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/AuthContext';
import { BooksPage } from './features/books/BooksPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AppLayout } from './layouts/AppLayout';

export default function App() {
  const { googleEnabled, loading, signIn, user } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Paper sx={{ p: 5 }}>
          <Stack spacing={3} alignItems="center">
            <Typography variant="h4">Book Search Manager</Typography>
            <Typography color="text.secondary" textAlign="center">
              Manage your reading list in the browser and sync it to your phone.
            </Typography>
            {googleEnabled ? (
              <GoogleLogin
                onError={() => undefined}
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    void signIn(credentialResponse.credential);
                  }
                }}
              />
            ) : (
              <Alert severity="info" sx={{ width: '100%' }}>
                Google Sign-In is not configured yet. Set <code>GOOGLE_CLIENT_ID</code> on the server.
              </Alert>
            )}
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<BooksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
