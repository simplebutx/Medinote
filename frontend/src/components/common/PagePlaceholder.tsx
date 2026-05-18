import { Card } from "../ui";

interface PagePlaceholderProps {
  title: string;
  description?: string;
}

function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <Card>
      <p className="mb-2 text-sm font-semibold text-blue-600">
        Page
      </p>

      <h1 className="text-3xl font-bold text-slate-900">
        {title}
      </h1>

      {description && (
        <p className="mt-3 text-slate-600">
          {description}
        </p>
      )}
    </Card>
  );
}

export default PagePlaceholder;