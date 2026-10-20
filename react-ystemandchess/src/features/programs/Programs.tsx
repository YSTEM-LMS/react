import React from "react";
import { useNavigate } from "react-router-dom";
import img2096 from "../../assets/images/student/1000002096.png";
import img2094 from "../../assets/images/student/1000002094.png";
import img2097 from "../../assets/images/student/1000002097.png";

export const Programs = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-white pb-16 font-sans text-black">
      <section className="mx-auto grid max-w-[1250px] gap-10 px-4 pt-16 md:grid-cols-2 md:items-center" aria-labelledby="programs-title">
        <div className="max-w-[500px]">
          <h1 id="programs-title" className="mb-10 text-[clamp(2.2rem,4vw,3rem)] font-bold leading-[1.25] text-[#333]" data-testid="programs-title">
            Helping your child develop<br />critical thinking skills
          </h1>
          <p className="mb-5 text-[1.3rem] font-medium leading-[1.6] text-left">
            We are a nonprofit organization empowering children to find their own success in STEM through Chess, Math and Computer Science.
          </p>
          <p className="mb-5 text-[1.3rem] font-medium leading-[1.6] text-left">
            Our mission is to Empower children with an opportunity to pursue STEM careers and change their life trajectories.
          </p>
          <p className="text-[1.3rem] font-medium leading-[1.6] text-left">
            We teach underserved children chess, math, and computer science to empower them to pursue STEM majors/professions with the support of professionals.
          </p>
        </div>

        <div className="relative h-[550px]">
          <img src={img2096} className="absolute right-5 top-0 z-10 h-auto w-[300px] object-cover shadow-[4px_4px_10px_rgba(0,0,0,0.2)]" alt="Student playing chess" />
          <img src={img2094} className="absolute left-0 top-36 z-20 h-auto w-[440px] object-cover shadow-[4px_4px_10px_rgba(0,0,0,0.2)]" alt="Group of students with trophy" />
          <img src={img2097} className="absolute bottom-0 right-0 z-30 h-auto w-[380px] object-cover shadow-[4px_4px_10px_rgba(0,0,0,0.2)]" alt="Students playing chess" />
        </div>
      </section>

      <div className="mx-auto mt-[100px] flex w-[min(1250px,calc(100%-var(--container-gutter)*2))] items-center justify-center">
        <img className="mx-auto w-full" src="/static/media/LogoLineBreak.1a0b644082b75f3578e3.png" alt="" role="presentation" />
      </div>

      <div className="mt-[140px] mb-[80px] text-center">
        <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-extrabold text-black">Everyone is included. Everyone is welcomed.</h2>
      </div>

      <section className="mx-auto flex w-[min(1250px,calc(100%-1.25rem*2))] flex-wrap justify-center gap-20 bg-white px-5 py-10">
        <div className="relative h-[540px] w-full max-w-[420px]">
          <div className="absolute left-4 top-6 h-full w-full rounded-xl bg-[#e7d94c]" />
          <div className="absolute inset-0 z-10 flex h-full w-full flex-col items-center rounded-xl bg-[#7ed321] p-10 text-center">
            <svg className="mb-5 h-12 w-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <h3 className="mb-4 text-[2.2rem] font-bold text-black">Free</h3>
            <p className="mb-4 text-[1.15rem] font-medium leading-[1.6] text-black">
              For students who qualify for<br />
              free and reduced lunch.<br />
              Our lessons are free.
            </p>
            <button className="mt-auto h-[60px] w-[230px] rounded-lg border-none bg-[#e7d94c] text-[1.2rem] font-bold text-black shadow-[6px_6px_0px_0px_#d3d3d3] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" onClick={() => navigate("/signup/parent")}>Join Now!</button>
          </div>
        </div>

        <div className="relative h-[540px] w-full max-w-[420px]">
          <div className="absolute left-4 top-6 h-full w-full rounded-xl bg-[#7ed321]" />
          <div className="absolute inset-0 z-10 flex h-full w-full flex-col items-center rounded-xl border-[3px] border-[#7ed321] bg-white p-10 text-center">
            <svg className="mb-5 h-12 w-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 22 22 7 12 2"></polygon>
            </svg>
            <h3 className="mb-4 text-[2.2rem] font-bold text-black">Premium</h3>
            <p className="mb-4 text-[1.15rem] font-medium leading-[1.6] text-black">
              For students who don't qualify<br />
              for free and reduced lunch.<br />
              $25 / week<br />
              First lesson is FREE.<br />
              Cancel anytime.
            </p>
            <button className="mt-auto h-[60px] w-[230px] rounded-lg border-none bg-[#f0f0f0] text-[1.2rem] font-bold text-black shadow-[6px_6px_0px_0px_#7ed321] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" onClick={() => navigate("/signup/parent")}>Apply Now!</button>
          </div>
        </div>
      </section>

      <section className="mt-16 w-full bg-[#dbe4cd] py-20">
        <div className="flex w-full items-center justify-center py-12" role="region">
          <img className="h-full w-full object-cover" src="/static/media/large_info.6b7bfc30b92945f88d42.png" alt="Y STEM mission statement emphasizing Play, Learn and Donate" />
        </div>
      </section>

      <section className="w-full bg-black">
        <div className="aspect-video w-full">
          <iframe
            className="h-full w-full"
            src="https://www.youtube.com/embed/SBr0bGgddIc?si=eTeDI8ByoDHHWKwA"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        </div>
      </section>

      <section className="flex justify-center bg-white px-5 py-20">
        <div className="w-full max-w-[800px] rounded-[12px] border-2 border-[#7ed321] bg-white p-10 text-center">
          <img className="mx-auto mb-8 h-auto w-full max-w-md" src="/static/media/chessGroup.5ae031cd3e8a7b2854c6.png" alt="Chess pieces lined up next to each other" />
          <h2 className="mb-9 text-[2.2rem] font-bold text-black">We Offer</h2>
          <div className="mb-12 grid w-full grid-cols-1 gap-y-10 gap-x-5 text-center md:grid-cols-3">
            <div className="flex items-center justify-center text-base font-medium text-black">Math Tutoring</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Chess</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Python</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Mentoring</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Personal<br />Development</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Linux</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Study Habits</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Careers in Computer<br />Science and STEM</div>
            <div className="flex items-center justify-center text-base font-medium text-black">Java</div>
          </div>
          <button className="rounded bg-[#e7d94c] px-16 py-3 text-[1.1rem] font-bold text-black shadow-[4px_4px_0px_0px_#d3d3d3] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#d3d3d3]" onClick={() => navigate("/signup/parent")}>Apply Now!</button>
        </div>
      </section>

      <section className="bg-white px-5 pb-10 pt-20 text-center">
        <h2 className="text-[2.2rem] font-bold text-[#333]">Current Status</h2>
      </section>

      <section className="relative overflow-hidden bg-[#dbe4cd] px-5 py-16">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "url('/static/media/chess-piece-pattern.svg')", backgroundRepeat: 'repeat', backgroundSize: '300px' }} />
        <div className="relative z-10 mx-auto flex w-full max-w-[850px] flex-col gap-8">
          <div className="flex items-center justify-between border-b-[3px] border-[#e01a1a] pb-2">
            <div className="flex items-center gap-5">
              <span className="w-[140px] text-right text-[7.5rem] font-extrabold leading-none text-transparent [-webkit-text-stroke:3px_#1a1a1a]">40</span>
              <div className="h-[60px] w-[4px] bg-[#e01a1a]" />
              <span className="text-[1.6rem] font-bold text-[#1a1a1a]">State Qualifiers</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[60px] w-[60px]">
              <rect x="2" y="2" width="20" height="20" />
              <rect x="2" y="2" width="10" height="10" fill="#222" stroke="none" />
              <rect x="12" y="12" width="10" height="10" fill="#222" stroke="none" />
            </svg>
          </div>

          <div className="flex items-center justify-between border-b-[3px] border-[#ebbd17] pb-2">
            <div className="flex items-center gap-5">
              <span className="w-[140px] text-right text-[7.5rem] font-extrabold leading-none text-transparent [-webkit-text-stroke:3px_#1a1a1a]">9</span>
              <div className="h-[60px] w-[4px] bg-[#ebbd17]" />
              <span className="text-[1.6rem] font-bold text-[#1a1a1a]">State Champions</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[60px] w-[60px]">
              <path d="M8 21h8M12 17v4M7 4h10M6 4v7c0 3.3 2.7 6 6 6s6-2.7 6-6V4H6z M2 4h4v7H2z M18 4h4v7h-4z" />
            </svg>
          </div>

          <div className="flex items-center justify-between border-b-[3px] border-[#f27200] pb-2">
            <div className="flex items-center gap-5">
              <span className="w-[140px] text-right text-[7.5rem] font-extrabold leading-none text-transparent [-webkit-text-stroke:3px_#1a1a1a]">2</span>
              <div className="h-[60px] w-[4px] bg-[#f27200]" />
              <span className="text-[1.6rem] font-bold text-[#1a1a1a]">National Qualifiers</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[60px] w-[60px]">
              <path d="M6 21h12M8 21v-4l-2-2v-4l2-2V5M16 21v-4l2-2v-4l-2-2V5M10 5v4 M14 5v4 M6 5h12 M8 8h8 M8 15h8 M10 2v3 M14 2v3 M6 2v3 M18 2v3"/>
            </svg>
          </div>
        </div>
      </section>

      <div className="mt-8 flex justify-center">
        <button className="bg-[#7ed321] px-8 py-3 text-[1.1rem] font-bold text-black shadow-[4px_4px_0px_0px_#E7D94C] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#E7D94C]">Donate Now!</button>
      </div>

      <div className="mx-auto mt-12 flex w-[min(1250px,calc(100%-1.25rem*2))] items-center justify-center">
        <img className="mx-auto w-full" src="/static/media/LogoLineBreak.1a0b644082b75f3578e3.png" alt="" role="presentation" />
      </div>

      <section className="mx-auto max-w-[900px] bg-white px-5 pb-20 pt-16">
        <h2 className="mb-16 text-center text-[2.2rem] font-bold text-[#333]">Books by Devin Nakano</h2>

        <div className="mb-8 flex flex-col gap-10 md:flex-row md:items-start">
          <div className="mx-auto flex w-[240px] flex-col items-center gap-4 md:mx-8">
            <img src="/static/media/book-howtostart.dd37637ae8e3d5b7d1d9.png" alt="How to Start a Tech-Based Nonprofit cover" className="h-auto w-full shadow-[0_4px_10px_rgba(0,0,0,0.15)]" />
            <button className="w-full rounded bg-[#e7d94c] px-4 py-3 text-[1.1rem] font-bold text-black shadow-[3px_3px_0px_0px_#d3d3d3] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#d3d3d3]" aria-label="Buy now How to Start a Tech-Based Nonprofit">Buy Now!</button>
          </div>
          <div className="flex-1">
            <h3 className="mb-4 text-[1.5rem] font-bold text-[#222] leading-[1.3]">How to Start a Tech-Based Nonprofit</h3>
            <p className="mb-5 text-base font-bold leading-[1.4] text-[#444]">
              Bridging the Opportunity Gap: Building a STEM Nonprofit to Change the Trajectory of Underserved Children's Lives
            </p>
            <p className="text-[0.95rem] leading-[1.6] text-[#555]">
              How to start techbased Nonprofit details the steps of Devin Nakano as he build Y STEM and Chess (YSC) Inc. The first in its series covers the first 4 years of YSC. Each chapter brings unique perspective of an entrepreneur building a nonprofit that uses technology to fulfill the Company Mission.
            </p>
          </div>
        </div>

        <hr className="my-10 border-t border-[#ccc]" />

        <div className="mb-8 flex flex-col gap-10 md:flex-row md:items-start">
          <div className="mx-auto flex w-[240px] flex-col items-center gap-4 md:mx-8">
            <img src="/static/media/book-thezerodollar.55de1a26d71d983cfbf9.png" alt="The Zero Dollar Workforce cover" className="h-auto w-full shadow-[0_4px_10px_rgba(0,0,0,0.15)]" />
            <button className="w-full rounded bg-[#e7d94c] px-4 py-3 text-[1.1rem] font-bold text-black shadow-[3px_3px_0px_0px_#d3d3d3] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#d3d3d3]" aria-label="Buy now The Zero Dollar Workforce">Buy Now!</button>
          </div>
          <div className="flex-1">
            <h3 className="mb-4 text-[1.5rem] font-bold text-[#222] leading-[1.3]">The Zero Dollar Workforce:<br />Hire a Team, Run Your Company, and Don't Spend Any Money</h3>
            <p className="mb-5 text-base font-bold leading-[1.4] text-[#444]">
              It's easier to hire and manage 40 people than just 2...<br />
              Someone can also hire and run this same team of 40 people completely for FREE...
            </p>
            <p className="text-[0.95rem] leading-[1.6] text-[#555]">
              The above sounds like total nonsense. Like someone is crazy. Like it's some kind of miracle. But a lot of creations in our world don't make any sense until after they're fully produced and studied. Imagine a mould that was found by accident that would become known as Penicillium and would have antibacterial properties that'd save the lives of billions of people throughout history. This idea also makes little to no sense until it's actually used in practice and studied. This book is the miracle that we have found with hiring and managing employees for startups, and we're here now to help you study and use it in practice.
            </p>
          </div>
        </div>

        <p className="mt-16 text-center text-[0.9rem] font-semibold text-[#444]">All proceeds will be donated to the organization</p>
      </section>
    </main>
  );
};

export default Programs;