import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  ScreenLoader,
} from '@/components/common/screen-loader';

import {
  useAuth,
} from './context/auth-context';

export const RequireAuth = () => {
  const {
    auth,
    verify,
    loading: globalLoading,
    menuLoading,
    canAccessPath,
    defaultPath,
  } = useAuth();

  const location =
    useLocation();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const verificationStarted =
    useRef(false);

  useEffect(() => {
    const checkAuth =
      async () => {
        if (
          !auth?.access_token ||
          !verificationStarted.current
        ) {
          verificationStarted.current =
            true;

          try {
            await verify();
          } finally {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      };

    void checkAuth();
  }, [
    auth,
    verify,
  ]);

  /*
   * Wait for authentication
   * and role menu.
   */
  if (
    loading ||
    globalLoading ||
    menuLoading
  ) {
    return <ScreenLoader />;
  }

  /*
   * User must still be authenticated.
   */
  if (!auth?.access_token) {
    return (
      <Navigate
        to={`/auth/signin?next=${encodeURIComponent(
          location.pathname,
        )}`}
        replace
      />
    );
  }

  /*
   * TEMPORARY DEVELOPMENT ACCESS
   *
   * Operator management pages are allowed
   * while the backend role-menu configuration
   * is being completed.
   *
   * Authentication is NOT bypassed.
   */
  const operatorDevelopmentPaths = [
    '/account/members/operators',
    '/account/members/add-operator',
    '/bus-verification',
  ];

  const isOperatorDevelopmentPath =
    operatorDevelopmentPaths.some(
      (path) =>
        location.pathname === path ||
        location.pathname.startsWith(
          `${path}/`,
        ),
    );

  /*
   * Normal role-menu permission check.
   */
  if (
    !isOperatorDevelopmentPath &&
    !canAccessPath(
      location.pathname,
    )
  ) {
    return (
      <Navigate
        to={
          defaultPath ||
          '/'
        }
        replace
      />
    );
  }

  return <Outlet />;
};
