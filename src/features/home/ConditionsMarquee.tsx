import { useTranslation } from "react-i18next";
import { conditions } from "@/lib/constants";

/** Auto-scrolling marquee of neurological conditions with icons. */
export const ConditionsMarquee = () => {
  const { t } = useTranslation();

  const conditionKeys = [
    "migraines",
    "parkinsons",
    "alzheimers",
    "essentialTremor",
    "cognitiveImpairments",
    "als",
    "cerebrovascular",
    "huntingtons",
    "ms",
    "epilepsy",
    "spinaBifida",
    "dystonias",
    "dementia",
    "cerebralPalsy",
    "diabeticNeuropathy",
  ];

  const renderCondition = (condition: (typeof conditions)[0], index: number, keySuffix = "") => (
    <div
      key={`${index}-${keySuffix}`}
      className="flex flex-col items-center justify-start gap-3 w-32 shrink-0"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/10 text-foreground">
        <condition.icon className="h-8 w-8" />
      </div>
      <span className="text-sm font-medium text-center text-muted-foreground leading-tight">
        {t(`conditions.list.${conditionKeys[index]}`)}
      </span>
    </div>
  );

  return (
    <section className="border-y border-foreground/10 bg-foreground/5 py-16 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
          {t("conditions.title")}
        </h2>
      </div>

      <div className="flex gap-8 group">
        <div className="flex shrink-0 gap-8 animate-marquee">
          {conditions.map((condition, i) => renderCondition(condition, i))}
        </div>
        <div className="flex shrink-0 gap-8 animate-marquee" aria-hidden="true">
          {conditions.map((condition, i) => renderCondition(condition, i, "dup"))}
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 text-center mt-12">
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          <strong className="text-foreground font-semibold">
            {t("conditions.statValue")}
          </strong>{" "}
          {t("conditions.statDescription")}
        </p>
      </div>
    </section>
  );
};
