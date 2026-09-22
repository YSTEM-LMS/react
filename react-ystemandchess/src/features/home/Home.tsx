import { useNavigate } from "react-router";
import Book1 from "../../assets/images/book-howtostart.png";
import Book2 from "../../assets/images/book-thezerodollar.png";
import TreesGroup from "../../assets/images/Trees-Group.png";
import LogoLineBr from "../../assets/images/LogoLineBreak.png";
import Heart from "../../assets/images/heart-regular.svg";
import Gem from "../../assets/images/gem-regular.svg";
import LargeInfo from "../../assets/images/large_info.png";
import ChessGroup from "../../assets/images/chessGroup.png";
import Ventive from "../../assets/images/sponsors/ventive.png";
import Kount from "../../assets/images/sponsors/kount.png";
import IdahoCentral from "../../assets/images/sponsors/idahoCentral.jpg";
import PH from "../../assets/images/sponsors/PH.png";
import BoiseRescue from "../../assets/images/partners/boiseRescue.png";
import BoysAndGirls from "../../assets/images/partners/boysAndGirls.png";
import Possible from "../../assets/images/partners/possible.png";
import BoiseDistrict from "../../assets/images/partners/boiseDistrict.png";
import Rotary from "../../assets/images/partners/Rotary.png";

const sponsors = [
  {
    name: "Ventive",
    logo: Ventive,
    href: "https://www.getventive.com",
  },
  {
    name: "Kount",
    logo: Kount,
    href: "https://kount.com",
  },
  {
    name: "Idaho Central",
    logo: IdahoCentral,
    href: "https://iccu.com",
  },
  {
    name: "PH",
    logo: PH,
    href: "https://partnerhero.com",
  },
];

const partners = [
  {
    name: "Boise Rescue Mission",
    logo: BoiseRescue,
    href: "https://boiserm.org",
  },
  {
    name: "Boys and Girls Clubs of Ada County",
    logo: BoysAndGirls,
    href: "https://adaclubs.org",
  },
  {
    name: "Everything's Possible",
    logo: Possible,
    href: "https://www.boiseschools.org",
  },
  {
    name: "Boise District Community Schools",
    logo: BoiseDistrict,
    href: "https://community-schools.boiseschools.org",
  },
  {
    name: "Boise Sunrise Rotary Club",
    logo: Rotary,
    href: "https://portal.clubrunner.ca/3864",
  }
];

const books = [
  {
    image: Book1,
    title: "How to Start a Tech-Based Nonprofit",
    subtitle:
      "Bridging the Opportunity Gap: Building a STEM Nonprofit to Change the Trajectory of Underserved Children's Lives",
    description:
      "How to start tech-based Nonprofit details the steps of Devin Nakano as he builds Y STEM and Chess (YSC) Inc. The first in its series covers the first 4 years of YSC. Each chapter brings unique perspective of an entrepreneur building a nonprofit that uses technology to fulfill the Company Mission.",
  },
  {
    image: Book2,
    title: "The Zero Dollar Workforce",
    subtitle: "Hire a Team, Run Your Company, and Don't Spend Any Money",
    description:
      "It's easier to hire and manage 40 people than just 2... Someone can also hire and run this same team of 40 people completely for FREE... The above sounds like total nonsense. Like someone is crazy. Like it's some kind of miracle. But a lot of creations in our world don't make any sense until they're fully produced and studied...",
  },
];


const Home = () => {
  const navigate = useNavigate();

  const handleDonateButton = () => {
    window.location.href =
      "https://donate.stripe.com/9B600jdVwd5x1jQ34r8IU01";
  };

  const handleBuyNow = (title = "") => {
    if (title === "How to Start a Tech-Based Nonprofit") {
      window.open(
        "https://www.amazon.com/How-Start-Tech-based-Nonprofit-Opportunity/dp/B0C4MML5WG",
        "_blank"
      );
    }

    if (title === "The Zero Dollar Workforce") {
      window.open(
        "https://www.amazon.com/Zero-Dollar-Workforce-Company-Spend/dp/B09NGVLQSS",
        "_blank"
      );
    }
  };

  return (
    <div role="main" className="w-full h-auto mt-2">
      {/* HERO SECTION */}
      <div role="region" className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8 mb-1 px-6 md:px-8 py-10">
        <div className="w-full md:w-1/2 flex justify-center items-center flex-col gap-6">
          <h1 className="text-3xl md:text-4xl text-left w-full text-dark font-bold pt-8">
            <span className="block leading-relaxed">
              Helping your child develop
            </span>
            <span className="block leading-relaxed">
              critical thinking skills!
            </span>
          </h1>

          <p className="text-xl md:text-2xl/10 pt-2 text-left w-full text-gray">
            We are a nonprofit organization empowering children <br /> to find
            their own success in STEM <br /> through Chess, Math and Computer
            Science.
          </p>

          <button
            className="btn-primary mt-4 self-start"
            onClick={handleDonateButton}
            aria-label="Donate to Y STEM and Chess"
          >
            Donate
          </button>
        </div>

        <div className="w-full md:w-1/2 flex items-center justify-center">
          <img
            src={TreesGroup}
            alt="Group of Y STEM mascots playing chess"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* LOGO BREAK */}
      <img
        src={LogoLineBr}
        className="w-full mx-auto"
        alt=""
        role="presentation"
      />

      {/* "EVERYONE IS INCLUDED" HEADING */}
      <h2 className="text-center text-3xl md:text-4xl md:my-12 font-bold text-dark">
        Everyone is included. Everyone is welcome.
      </h2>

      {/* FREE/PREMIUM CARDS */}
      <div role="region" className="w-full mx-auto flex flex-col md:flex-row items-stretch gap-12 md:gap-16 lg:gap-40 justify-center px-6 md:px-8 mt-16 mb-12">
        {/* Free Card */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 lg:w-1/4 bg-primary rounded-3xl shadow-card-yellow p-8 gap-4">
          <img src={Heart} alt="" className="w-16 h-16 md:w-20 md:h-20" />
          <h3 className="text-3xl md:text-4xl font-bold text-dark mt-4 mb-4">Free</h3>
          <p className="text-lg md:text-xl/9 text-center text-dark leading-relaxed">
            For students who qualify for <br />free and reduced lunch.<br />
            Our lessons are free.
          </p>
          <button
            className="btn-primary mt-auto mb-4"
            aria-label="Join now for free"
            onClick={() => navigate("/signup/parent")}
          >
            Join Now!
          </button>
        </div>

        {/* Premium Card */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 lg:w-1/4 bg-light rounded-3xl shadow-card-green p-8 gap-4">
          <img src={Gem} alt="" className="w-16 h-16 md:w-20 md:h-20" />
          <h3 className="text-3xl md:text-4xl font-bold text-dark mt-4 mb-4">Premium</h3>
          <p className="text-lg md:text-xl/9 text-center text-dark leading-relaxed mb-20">
            For students who don't qualify <br />for free and reduced lunch.
            <br />$25 / Week <br />First lesson is FREE. <br />Cancel anytime.
          </p>
          <button
            className="btn-primary mt-auto mb-4"
            aria-label="Join now premium"
            onClick={() => navigate("/signup/parent")}
          >
            Join Now!
          </button>
        </div>
      </div>

      {/* MISSION STATEMENT IMAGE */}
      <div role="region" className="flex w-full justify-center items-center py-12">
        <img
          src={LargeInfo}
          alt="Y STEM mission statement emphasising Play, Learn and Donate"
          className="w-full h-auto"
        />
      </div>

      {/* VIDEO SECTION */}
      <div className="flex w-full h-auto md:h-[90vh] justify-center items-center py-8 md:py-0">
        <iframe
          title="Y STEM and Chess Introduction Video"
          className="w-[90%] md:w-[85%] h-[300px] md:h-[90%]"
          src="https://www.youtube.com/embed/SBr0bGgddIc"
          allowFullScreen
        />
      </div>

      {/* CTA SECTION - "START NOW" */}
      <div className="flex justify-center items-center w-full px-6 md:px-8 py-12 md:py-16">
        <div className="flex justify-center items-center flex-col w-full max-w-7xl border-4 border-primary rounded-lg py-12 px-6 gap-6">
          <img
            src={ChessGroup}
            alt="Chess pieces lined up next to each other"
            className="w-full max-w-md h-auto"
          />
          <div className="text-xl md:text-4xl font-bold text-dark text-center mt-4 mb-4">
            Start now and sign up later!
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate("./play")}
            aria-label="Get started"
          >
            Get Started!
          </button>
        </div>
      </div>

      {/* LOGO BREAK */}
      <img
        src={LogoLineBr}
        className="w-full mx-auto"
        alt=""
        role="presentation"
      />

      {/* BOOKS SECTION */}
      <div role="region" className="w-full h-auto my-12 px-6 md:px-12">
        <h2 className="text-center text-3xl md:text-4xl md:my-12 font-bold text-dark">
          Books by Devin Nakano
        </h2>

        {books.map((book, index) => (
          <div key={index} className="flex flex-col md:flex-row items-start border-2 border-accent p-4 md:p-6 rounded-md mb-8">
            <div className="flex flex-col items-center mx-auto md:mx-8 mb-6 md:mb-0">
              <img
                src={book.image}
                alt={`${book.title} cover`}
                className="w-[160px] h-auto mb-4"
              />
              <button
                className="btn-primary"
                aria-label={`Buy now ${book.title}`}
                onClick={() => handleBuyNow(book.title)}
              >Buy Now!
              </button>
            </div>

            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-dark text-left mb-2">
                {book.title}
              </h3>
              <h4 className="text-lg md:text-xl text-dark text-left mb-4">
                {book.subtitle}
              </h4>
              <p className="text-base text-gray text-left leading-relaxed">
                {book.description}
              </p>
            </div>
          </div>
        ))}

        <footer role="contentinfo" className="bg-secondary text-center mt-8">
          <p className="text-lg text-dark font-bold leading-relaxed">All proceeds will be donated to the organization</p>
        </footer>
      </div>

      {/* LOGO BREAK */}
      <img
        src={LogoLineBr}
        className="w-full mx-auto my-10"
        alt=""
        role="presentation"
      />

      {/* SPONSORS */}
      <div className="ml-5 mr-5 mb-12">
        <h3 className="text-center text-2xl md:text-3xl md:my-8 font-bold text-dark">
          Our Sponsors
        </h3>
        <div className="flex flex-wrap justify-center items-center gap-12">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.name}
              href={sponsor.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={sponsor.name}
              className="transition-opacity hover:opacity-80"
            >
              <img
                src={sponsor.logo}
                alt={`${sponsor.name} logo`}
                className="h-20 w-40 object-contain rounded-md"
              />
            </a>
          ))}
        </div>
      </div>

      {/* PARTNERS  */}
      <div className="ml-5 mr-5 mb-36">
        <h3 className="text-center text-2xl md:text-3xl md:my-8 font-bold text-dark">
          Our Partners
        </h3>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {partners.map((partner) => (
            <a
              key={partner.name}
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={partner.name}
              className="bg-white p-4 rounded-md transition-opacity hover:opacity-80"
            >
              <img
                src={partner.logo}
                alt={`${partner.name} logo`}
                className="h-16 w-37 object-contain"
              />
            </a>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;
