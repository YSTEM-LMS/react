import React from "react";
import LogoLineBr from "../../../assets/images/LogoLineBreak.png";

const Financial = () => {
  return (
    <main role="main" className="font-sans text-dark p-5 md:p-10 lg:p-12">
      <h1 className="text-3xl md:text-4xl font-bold text-black text-center mb-10 md:text-left md:ml-[10%]">Financials</h1>
      <div className="flex justify-center my-5">
        <img src={LogoLineBr} alt="" role="presentation" className="w-4/5 mx-auto"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 md:gap-y-10 md:gap-x-20 max-w-6xl mx-auto justify-items-center">
        <section className="bg-light border-2 border-primary rounded-lg p-8 w-full max-w-xs text-center shadow-[8px_8px_0px_0px_#83ce31] transition-transform duration-200 hover:scale-105" aria-label="2018 Financials" tabIndex={0}>
          <h3 className="text-xl md:text-2xl mb-4">2018 Financials</h3>
          <button className="bg-accent border-none rounded-md py-2 px-4 text-base cursor-pointer font-bold transition duration-300 hover:brightness-110 active:brightness-90" aria-label="View 2018 Finnancials">View Here</button>
        </section>
        <section className="bg-light border-2 border-primary rounded-lg p-8 w-full max-w-xs text-center shadow-[8px_8px_0px_0px_#83ce31] transition-transform duration-200 hover:scale-105" aria-label="Form 990" tabIndex={0}>
          <h3 className="text-xl md:text-2xl mb-4">Form 990</h3>
          <button className="bg-accent border-none rounded-md py-2 px-4 text-base cursor-pointer font-bold transition duration-300 hover:brightness-110 active:brightness-90" aria-label="View Form 990">View Here</button>
        </section>
        <section className="bg-light border-2 border-primary rounded-lg p-8 w-full max-w-xs text-center shadow-[8px_8px_0px_0px_#83ce31] transition-transform duration-200 hover:scale-105" aria-label="2019 Financials" tabIndex={0}>
          <h3 className="text-xl md:text-2xl mb-4">2019 Financials</h3>
          <button className="bg-accent border-none rounded-md py-2 px-4 text-base cursor-pointer font-bold transition duration-300 hover:brightness-110 active:brightness-90" aria-label="View 2019 Finnancials">View Here</button>
        </section>
        <section className="bg-light border-2 border-primary rounded-lg p-8 w-full max-w-xs text-center shadow-[8px_8px_0px_0px_#83ce31] transition-transform duration-200 hover:scale-105" aria-label="2020 Financials" tabIndex={0}>
          <h3 className="text-xl md:text-2xl mb-4">2020 Financials</h3>
          <button className="bg-accent border-none rounded-md py-2 px-4 text-base cursor-pointer font-bold transition duration-300 hover:brightness-110 active:brightness-90" aria-label="View 2020 Finnancials">View Here</button>
        </section>
        <section className="bg-light border-2 border-primary rounded-lg p-8 w-full max-w-xs text-center shadow-[8px_8px_0px_0px_#83ce31] transition-transform duration-200 hover:scale-105" aria-label="2021 Financials" tabIndex={0}>
          <h3 className="text-xl md:text-2xl mb-4">2021 Financials</h3>
          <button className="bg-accent border-none rounded-md py-2 px-4 text-base cursor-pointer font-bold transition duration-300 hover:brightness-110 active:brightness-90" aria-label="View 2021 Finnancials">View Here</button>
        </section>
        <section className="bg-light border-2 border-primary rounded-lg p-8 w-full max-w-xs text-center shadow-[8px_8px_0px_0px_#83ce31] transition-transform duration-200 hover:scale-105" aria-label="2022 Financials" tabIndex={0}>
          <h3 className="text-xl md:text-2xl mb-4">2022 Financials</h3>
          <button className="bg-accent border-none rounded-md py-2 px-4 text-base cursor-pointer font-bold transition duration-300 hover:brightness-110 active:brightness-90" aria-label="View 2022 Finnancials">View Here</button>
        </section>
      </div>
    </main>
  );
};

export default Financial;
