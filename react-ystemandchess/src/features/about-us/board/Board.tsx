import React from "react";
import LogoLineBr from "../../../assets/images/LogoLineBreak.png";

const Board = () => {
  return (
    <main role="main" className="px-5 py-8 font-sans text-dark">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-[28px] font-bold text-left">Board</h1>
        <img src={LogoLineBr} alt="" role="presentation" className="mx-auto mb-10 block w-full max-w-4xl" />
        <div className="grid gap-10 lg:grid-cols-2">
          <section className="space-y-4 text-left" role="region" aria-label="Board Officers" tabIndex={0}>
            <h2 className="text-2xl font-bold">Officers</h2>
            <ul className="space-y-4">
              <li>
                <span className="block text-xl font-bold">Devin Nakano</span>
                Founder, President and Executive Director
              </li>
              <li>
                <span className="block text-xl font-bold">Jasmine Redlich</span>
                Vice President
              </li>
              <li>
                <span className="block text-xl font-bold">Owen Oertell</span>
                Secretary
              </li>
              <li>
                <span className="block text-xl font-bold">Kelsey Korvela</span>
                Treasurer
              </li>
            </ul>
          </section>
          <section className="space-y-4 text-left" role="region" aria-label="Board Members" tabIndex={0}>
            <h2 className="text-2xl font-bold">Board Members</h2>
            <ul className="space-y-4">
              <li>
                <span className="block text-xl font-bold">Amit Jain, Phd</span>
                Chair of the Computer Science Boise State University
              </li>
              <li>
                <span className="block text-xl font-bold">Sasikanth R.</span>
                International Board Member and Entrepreneur
              </li>
              <li>
                <span className="block text-xl font-bold">Holly Trainer</span>
                Retired Public School teacher
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Board;
