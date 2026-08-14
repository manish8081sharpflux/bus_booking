import { Fragment } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/providers/settings-provider';
import { PageNavbar } from '@/pages/account';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { UsersContent } from '.';

export function UsersPage() {
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
                View and manage all registered users.
              </ToolbarDescription>
            </ToolbarHeading>
            {/* <ToolbarActions>
              <Button asChild>
                <Link to="/account/members/add-user">Add User</Link>
              </Button>
            </ToolbarActions> */}
          </Toolbar>
        </Container>
      )}
      <Container>
        <UsersContent />
      </Container>
    </Fragment>
  );
}
