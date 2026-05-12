import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import TeamSection from "@/components/TeamSection";
import LoyaltySection from "@/components/LoyaltySection";
import GallerySection from "@/components/GallerySection";
import AboutSection from "@/components/AboutSection";
import ReviewsSection from "@/components/ReviewsSection";
import BookingSection from "@/components/BookingSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="animated-bg" />
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ServicesSection />
        <TeamSection />
        <LoyaltySection />
        <GallerySection />
        <AboutSection />
        <ReviewsSection />
        <BookingSection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
