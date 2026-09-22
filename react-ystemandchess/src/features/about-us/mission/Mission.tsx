import React from "react";
import { useNavigate } from "react-router";
import "./Mission.scss";
import ImageOne from "../../../assets/images/mission-image.png";
import LogoLineBreak from "../../../assets/images/LogoLineBreak.png";
import FounderStory from "../../../assets/images/founder-story.png";
import Images from "../../../assets/images/imageImporter";

const Mission = () => {
  const navigate = useNavigate();

  return (
    <main role="main" className="main-content">
      <section role="region" aria-label="Mission statement header section" className="mission-header" tabIndex={0}>
        <div className="mission-statement-container">
        <div className="our-mission">
          <h1>Our Mission</h1>
          <p>
            Empower underserved and at-risk children with an opportunity to
            pursue STEM careers and change their life trajectory.
          </p>
        </div>
        <div className="what-we-do">
          <h1>What We Do</h1>
          <p>
            We teach children chess, math, and computer science to empower them
            to pursue STEM majors/professions with the support of professionals.
          </p>
        </div>
        </div>
        <figure>
          <img className="picture" src={ImageOne} alt="" role="presentation" />
        </figure>
      </section>
      <figure className="logo-break">
        <img src={LogoLineBreak} alt="" role="presentaion"/> 
      </figure>  

      <figure className="founder-story">
        <img src={FounderStory} alt="Story of the founding of YSTEM" />
      </figure>

      <figure className="logo-break">
        <img src={LogoLineBreak} alt="" role="presentaion"/> 
      </figure> 

      <div className="home-content2" role="region">
        <div className="card1">
          <img src={Images.Heart} alt="Heart icon"></img>
          <h1 id="h1-home">Free</h1>
          <p>
          For students who qualify for <br /> free and reduced lunch.
          <br />
          Our lessons are free.
          </p>
          <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50" aria-label="Join now for free button" onClick={() => navigate("/signup/parent")}>      
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-5 py-1 text-lg font-medium text-white backdrop-blur-3xl">
              Join Now !
            </span>
          </button>
        </div>
        <div className="card2">
          <img src={Images.Gem} alt="Gem icon"></img>
          <h1 id="h1-home">Premium</h1>
          <p>
            For students who don't qualify <br /> for free and reduced lunch.{" "}
            <br />
            $25 / Week <br /> First lesson is FREE. <br /> Cancel anytime.
            </p>
            <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50" aria-label="Join now premium button" onClick={() => navigate("/signup/parent")}>
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
