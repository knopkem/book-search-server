import LogoutIcon from '@mui/icons-material/Logout';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export function AppLayout() {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 2 }}>
          <MenuBookIcon />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Book Search Manager
          </Typography>
          <Button
            color={pathname === '/' ? 'secondary' : 'inherit'}
            component={RouterLink}
            to="/"
            startIcon={<MenuBookIcon />}
            variant={pathname === '/' ? 'contained' : 'text'}
          >
            Books
          </Button>
          <Button
            color={pathname === '/settings' ? 'secondary' : 'inherit'}
            component={RouterLink}
            to="/settings"
            startIcon={<SettingsIcon />}
            variant={pathname === '/settings' ? 'contained' : 'text'}
          >
            Settings
          </Button>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar alt={user?.displayName} src={user?.avatarUrl ?? undefined}>
              {user?.displayName?.slice(0, 1)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2">{user?.displayName}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {user?.email}
              </Typography>
            </Box>
          </Stack>
          <Button color="inherit" onClick={() => void signOut()} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
