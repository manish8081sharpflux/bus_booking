import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { useSettings } from '@/providers/settings-provider';
import { PageNavbar } from '@/pages/account';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { AccountCreateUserContent } from '.';

export function AccountCreateUserPage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                Create users directly from the admin panel.
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountCreateUserContent />
      </Container>
    </Fragment>
  );
}
