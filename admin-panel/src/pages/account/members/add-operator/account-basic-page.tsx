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
import { AccountAddOperatorContent } from '.';

export function AccountAddOperatorPage() {
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
                Register a new operator from the admin panel.
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline" asChild>
                <Link to="/account/members/operators">Operator List</Link>
              </Button>
            </ToolbarActions> 
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountAddOperatorContent />
      </Container>
    </Fragment>
  );
}
