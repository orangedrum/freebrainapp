import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Modal } from "@/components/shared/Modal";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { GridBackground } from "@/components/shared/GridBackground";
import { HeroSection } from "@/features/home/HeroSection";
import { ConditionsMarquee } from "@/features/home/ConditionsMarquee";
import { OnDemandTherapySection } from "@/features/home/OnDemandTherapySection";
import { BecomeFreeBrainerSection } from "@/features/home/BecomeFreeBrainerSection";
import { GetInvolvedSection } from "@/features/home/GetInvolvedSection";
import { SupportingEvidenceSection } from "@/features/home/SupportingEvidenceSection";
import { SocialFeedsSection } from "@/features/home/SocialFeedsSection";
import { useModalState } from "@/hooks/useModalState";

/** Home page — slim composition layer that orchestrates all sections. */
const Index = () => {
  const { t } = useTranslation();
  const { modalConfig, openModal, closeModal } = useModalState();

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <main className="flex-1">
        <HeroSection onOpenModal={openModal} />
        <ConditionsMarquee />

        <section id="platform" className="relative overflow-hidden py-20 md:py-32 z-0">
          <GridBackground />
          <div className="container relative mx-auto px-4 md:px-6 z-10">
            <SectionHeading
              title={t("platform.title")}
              subtitle={t("platform.subtitle")}
            />
            <div className="max-w-4xl mx-auto">
              <OnDemandTherapySection onOpenModal={openModal} />
              <BecomeFreeBrainerSection onOpenModal={openModal} />
            </div>
          </div>
        </section>

        <GetInvolvedSection onOpenModal={openModal} />
        <SupportingEvidenceSection />
        <SocialFeedsSection />
      </main>

      <Footer />

      <Modal
        config={modalConfig}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />
    </div>
  );
};

export default Index;
