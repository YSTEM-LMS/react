import React from "react";
import ImageOne from "../../../assets/images/mission-image.png";
import LogoLineBreak from "../../../assets/images/LogoLineBreak.png";
import FounderStory from "../../../assets/images/founder-story.png";
import Images from "../../../assets/images/imageImporter";

const Mission = () => {
  return (
    <main role="main" className="w-full h-auto mt-5 p-5 font-sans text-dark md:p-10 lg:p-12">
      <section role="region" aria-label="Mission statement header section" className="w-[85%] mx-auto mb-10 flex flex-col md:flex-row items-center gap-10" tabIndex={0}>
        <div className="flex flex-col gap-5 w-full">
          <div className="our-mission">
            <h1 className="pt-5 text-3xl md:text-4xl font-bold text-dark text-left mb-2.5">Our Mission</h1>
            <p className="text-base md:text-lg lg:text-xl text-left leading-relaxed text-muted max-w-xl">
              Empower underserved and at-risk children with an opportunity to
              pursue STEM careers and change their life trajectory.
            </p>
          </div>
          <div className="what-we-do">
            <h1 className="text-3xl md:text-4xl font-bold text-dark text-left mb-2.5">What We Do</h1>
            <p className="text-base md:text-lg lg:text-xl text-left leading-relaxed text-muted max-w-xl">
              We teach children chess, math, and computer science to empower them
              to pursue STEM majors/professions with the support of professionals.
            </p>
          </div>
        </div>
        <figure className="my-auto w-full md:w-auto">
          <img className="w-full max-w-md lg:max-w-lg mx-auto block rounded-lg shadow-md" src={ImageOne} alt="" role="presentation" />
        </figure>
      </section>
      <figure className="mx-auto block my-10">
        <img src={LogoLineBreak} alt="" role="presentaion" className="w-full max-w-2xl mx-auto block"/> 
      </figure>  

      <figure className="mx-auto block my-10">
        <img src={FounderStory} alt="Story of the founding of YSTEM" className="w-full max-w-2xl mx-auto block rounded-lg shadow-md" />
      </figure>

      <figure className="mx-auto block my-10">
        <img src={LogoLineBreak} alt="" role="presentaion" className="w-full max-w-2xl mx-auto block"/> 
      </figure> 

      <div className="flex flex-col md:flex-row justify-center gap-10 my-10" role="region">
        <div className="flex flex-col items-center p-5 bg-white rounded-lg shadow-md">
          <img src={Images.Heart} alt="Heart icon" className="w-20 h-20 mb-4"></img>
          <h1 className="text-3xl md:text-4xl font-bold text-dark mb-2">Free</h1>
          <p className="text-base md:text-lg text-muted text-center leading-relaxed mb-4">
          For students who qualify for <br /> free and reduced lunch.
          <br />
          Our lessons are free.
          </p>
          <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50" aria-label="Join now for free button">      
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-5 py-1 text-lg font-medium text-white backdrop-blur-3xl">
              Join Now !
            </span>
          </button>
        </div>
        <div className="flex flex-col items-center p-5 bg-white rounded-lg shadow-md">
          <img src={Images.Gem} alt="Gem icon" className="w-20 h-20 mb-4"></img>
          <h1 className="text-3xl md:text-4xl font-bold text-dark mb-2">Premium</h1>
          <p className="text-base md:text-lg text-muted text-center leading-relaxed mb-4">
            For students who don't qualify <br /> for free and reduced lunch.{" "}
            <br />
            $25 / Week <br /> First lesson is FREE. <br /> Cancel anytime.
            </p>
            <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50" aria-label="Join now premium button">
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-5 py-1 text-lg font-medium text-white backdrop-blur-3xl">
              Join Now !
            </span>
          </button>
        </div>
      </div>
    </main>
  );
};
export default Mission;
