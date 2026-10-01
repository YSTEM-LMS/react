import React from "react";
import Images from "../../../assets/images/imageImporter";

const paragraphClasses = "mx-auto max-w-[800px] px-5 text-[1.05rem] leading-[1.7] text-dark text-justify";
const sectionClasses = "bg-[#dff2c8] py-5";

const ChessBenefitPage = () => {
  return (
    <main id="main-content-chess" className="bg-[#dff2c8]" role="main">
      <section className={sectionClasses} aria-label="Main chess benefit section">
        <div className="text-center">
          <h1 className="pt-[10px] text-[2.2rem] font-black text-[#556b2f]">The Benefits of Chess</h1>
        </div>

        <figure className="mx-auto max-w-[800px]">
          <img
            className="mx-auto mt-[15px] block w-[90%] max-w-[800px] rounded-[10px] object-cover"
            src={Images.mathComputerImg}
            alt="Students practicing chess on computers"
          />
          <figcaption className="mt-[5px] text-center text-[0.85rem] text-muted">
            Students practicing their chess skills in the classroom
          </figcaption>
        </figure>

        <div className={paragraphClasses}>
          <p>
            The Importance of Online Expansion of Y STEM and Chess Inc. focuses
            on using technology to scale. Yes, we are nonprofit but more
            fundamentally we are a technology company. Technology will help
            individualize lessons in chess, math, and computer science.
            Individualized lessons will be conducted online via our website to
            help rural and urban communities that lack access to resources in
            High School or pay for courses at other institutions. The rural and
            urban companies simply don’t have the resources to prepare students
            for success in STEM. Using the proven aspects of our program, we can
            change the future of students that have largely been excluded from
            the high-paying jobs that STEM provides while increasing inclusivity
            and lowering poverty.
          </p>
        </div>

        <div className={`${paragraphClasses} mt-[15px]`}>
          <p>
            Deployment of our learning program online will also provide us with
            a reliable form of donation generation. For those who are not
            qualified under specific government subsidy programs, a membership
            donation scheduled will be available to utilize the program. This
            allows us to deliver our program to middle-class families and above
            without losing focus on our primary mission. The donations generated
            through this model will allow us to continue scaling our program to
            underserved communities. Additionally, the model increases awareness
            in families and communities that support our continued expansion via
            sponsorships, volunteering, publicity, software development, and
            marketing.
          </p>
        </div>
      </section>

      <section className="flex min-h-[160px] items-center justify-center bg-[#c1dcaf]" aria-label="Quote section">
        <div className="max-w-[500px] px-5 text-center text-[1.2rem] font-bold leading-[1.7] text-dark">
          "Playing chess encourages students to put their best effort into
          other classes and sparks their interest in school"
        </div>
      </section>

      <section className={sectionClasses} aria-label="Chess benefit details section">
        <div className={paragraphClasses}>
          <p>
            Chess gives students skills they can use anywhere in life, like
            problem-solving, concentration, and confidence. Chess teaches
            students how to analyze a situation for the next move, letting them
            become more adept at problem-solving. As students think through
            situations, they take chances and choose which pieces to protect and
            sacrifice. These decisions teach students risk assessment, allowing
            them to make more calculated risks as one study working with
            students in Bangladesh found. Making decisions like this also
            requires focusing on the game which helps students concentrate for
            longer periods of time. These benefits to concentration were
            supported by a study with students diagnosed with ADHD. These skills
            will come in use for the students in any field, STEM or otherwise,
            that they choose to go into.
          </p>
        </div>

        <div className={`${paragraphClasses} mt-[15px]`}>
          <p>
            Alongside these skills, chess can boost students' confidence. A
            survey by the Saint Louis Chess Club found that the majority of
            students in chess lessons look forward to school on days they play
            chess. Up to seventy-five percent of students said that chess makes
            them more willing to challenge themselves. Playing chess encourages
            students to put their best effort into their other classes and
            sparks their interest in school.
          </p>
        </div>

        <div className={`${paragraphClasses} mt-[15px]`}>
          <p>
            Many students also pursue interest in the game itself, playing in
            championships at even the state level. June, one of the students at
            Y STEM and Chess Inc, tested in the top one percent of her grade and
            became a state champion in chess. Her mother testified that Y STEM
            and Chess helped her daughter grow to have “incredible focus” and
            that “her self-esteem has skyrocketed” after joining Y STEM and
            Chess.
          </p>
        </div>

        <figure className="mx-auto max-w-[800px]">
          <img
            className="mx-auto mt-[15px] block h-[450px] w-[max(100%,300px)] object-contain"
            src={Images.mathChampImg}
            alt="A student standing and holding a trophy alongside their mentor."
          />
          <figcaption className="mt-[5px] text-center text-[0.85rem] text-muted">
            A student with their mentor after winning an award.
          </figcaption>
        </figure>

        <div className={`${paragraphClasses} mt-[15px]`}>
          <p>
            Y STEM and Chess dedicates itself to helping students like June, and
            chess is a fundamental part of how we at Y STEM and Chess aim to
            empower them. Thirty to forty percent of children are underserved
            and more likely to drop out, fall ill, or go to jail. They are also
            less likely to go into STEM fields, with less than five percent of
            STEM jobs being held by minorities. Y STEM and Chess offers
            one-on-one tutoring for twenty-five dollars a year to families that
            can afford it, alongside tax-deductible donations and helping their
            children learn valuable skills.
          </p>
        </div>
        <div className={`${paragraphClasses} mt-[15px]`}>
          <p>
            Today, Y STEM and Chess has reached over seven hundred students in
            five states and three countries, and with a team of over a hundred
            volunteers, we hope to be able to reach even more. We provide
            classes in person in Boise and remotely across the country and the
            world. Washington, California, Texas, Florida, New York, and Oregon.
            Find us at www.ystemandchess.com and find out how you can help.
          </p>
        </div>
      </section>
    </main>
  );
};

export default ChessBenefitPage;
