import Link from "next/link";
import { Button, Card } from "@cadernim/ui";
import { BookletPreview } from "@/components/booklet-preview";
import { decodeBookletSpec } from "@/lib/booklet-spec";
import { buildBookletHymns } from "@/lib/booklet-data";

type SearchParams = {
  title?: string;
  spec?: string;
};

export default async function BookletPreviewPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const title = (params.title ?? "Caderninho de Hinos").trim() || "Caderninho de Hinos";
  const spec = decodeBookletSpec(params.spec);

  if (!spec) {
    return (
      <Card className="space-y-4">
        <p className="text-sm text-red-600">Nao foi possivel ler a selecao do caderninho. Monte novamente.</p>
        <Link href="/booklets">
          <Button>Voltar ao gerador</Button>
        </Link>
      </Card>
    );
  }

  const filtered = await buildBookletHymns(spec);

  if (!filtered.length) {
    return (
      <Card className="space-y-4">
        <p className="text-sm text-red-600">Nenhum hino valido foi encontrado para gerar o caderninho.</p>
        <Link href="/booklets">
          <Button>Voltar ao gerador</Button>
        </Link>
      </Card>
    );
  }

  return <BookletPreview title={title} specEncoded={params.spec ?? ""} hymns={filtered} />;
}
