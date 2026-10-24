import { Link } from "react-router-dom";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/feedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <EmptyState title="We can't find that page" action={<Link to="/" className={buttonClass("secondary")}>Go to the front page</Link>}>
      The link may be broken, or the page may have moved.
    </EmptyState>
  );
}

export function UnauthorizedPage() {
  useDocumentTitle("Access denied");
  return (
    <EmptyState title="You don't have access to that page" action={<Link to="/" className={buttonClass("secondary")}>Go to the front page</Link>}>
      That area is for administrators. If you think you should have access, ask an administrator to update your role.
    </EmptyState>
  );
}
