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
import { AccountOperatorsContent } from '.';

export function AccountOperatorsPage() {
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
                View and manage all registered operators.
              </ToolbarDescription>
            </ToolbarHeading>
            {/* <ToolbarActions>
              <Button asChild>
                <Link to="/account/members/add-operator">Add Operator</Link>
              </Button>
            </ToolbarActions> */}
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountOperatorsContent />
      </Container>
    </Fragment>
  );
}
