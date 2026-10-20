import React from "react";
import LogoLineBreak from "../../../assets/images/LogoLineBreak.png";
import ventive from "../../../assets/images/sponsors/ventive.png";
import kount from "../../../assets/images/sponsors/kount.png";
import idahoCentral from "../../../assets/images/sponsors/idahoCentral.jpg";
import PH from "../../../assets/images/sponsors/PH.png";
import boiseRescue from "../../../assets/images/partners/boiseRescue.png";
import boiseDistrict from "../../../assets/images/partners/boiseDistrict.png";
import boysAndGirls from "../../../assets/images/partners/boysAndGirls.png";
import possible from "../../../assets/images/partners/possible.png";
import rotary from "../../../assets/images/partners/Rotary.png";

const sponsors = [
  { src: ventive, alt: "Ventive" },
  { src: kount, alt: "Kount" },
  { src: idahoCentral, alt: "Idaho Central Credit Union" },
  { src: PH, alt: "Partner Hero (PH)" },
];

const partners = [
  { src: boiseRescue, alt: "Boise Rescue Misison Ministries" },
  { src: boiseDistrict, alt: "Boise District Community Schools" },
  { src: boysAndGirls, alt: "Boys and Girls Clubs of Ada County" },
  { src: possible, alt: "Everything's Possible" },
  { src: rotary, alt: "Boise Sunrise Rotary Club" },
];

const SponsorsPartners = () => {

  return (
    <main role="main" className="px-5 py-5 font-sans text-dark">
      <div className="mx-auto max-w-6xl">
      <h1 className="mx-[5%] mb-[10px] text-[30px] font-bold text-left">Sponsors & Partners</h1>
      <p className="mx-[5%] text-[18px] leading-[1.5] text-left">
        We are grateful for the support of our sponsors and partners who help
        make our mission possible. Their contributions enable us to provide
        resources, training, and opportunities for the youth in our community.
        Thank you for your generosity and commitment to making a difference!
      </p>
      <figure className="my-[30px]">
        <img src={LogoLineBreak} alt="" role="presentation" className="mx-auto block w-full max-w-full" /> 
      </figure>  

      <section className="mt-0" role="region">
        <h2 className="px-5 py-5 text-[18px] font-medium text-left">Sponsors</h2>
        <div className="mx-[5%] mb-[10%] flex flex-wrap items-center justify-between">
          {sponsors.map((logo) => (
            <img key={logo.alt} src={logo.src} alt={logo.alt} className="mx-[5%] mb-6 max-h-[100px] max-w-[150px] flex-[1_0_auto]" />
          ))}
        </div>
      </section>

      <section className="mt-0" role="region">
        <h2 className="px-5 py-5 text-[18px] font-medium text-left">Partners</h2>
        <div className="mx-[5%] mb-[10%] flex flex-wrap items-center justify-between">
          {partners.map((logo) => (
            <img key={logo.alt} src={logo.src} alt={logo.alt} className="mx-[5%] mb-6 max-h-[100px] max-w-[150px] flex-[1_0_auto]" />
          ))}
        </div>
      </section>
      </div>
    </main>
  );
};

export default SponsorsPartners;
