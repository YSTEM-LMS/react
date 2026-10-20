import React from "react";
import ImageOne from "../../../assets/images/mathArticle/computer.png";
import ImageTwo from "../../../assets/images/mathArticle/Junechamp 2.png";
import { cn } from "../../../core/utils/cn";

const sectionClasses = "bg-[#dff2c8] py-5";
const paragraphClasses = "mx-auto max-w-[800px] px-5 text-[1.05rem] leading-[1.7] text-dark text-justify";

const CSBenefitPage = () => {
  return (
    <main id="main-contentCS" className="min-h-screen bg-[#dff2c8] font-sans text-dark" role="main">
      <section className={sectionClasses} aria-label="Main CS benefit section" tabIndex={0}>
        <div className="text-center">
          <h1 className="pt-[10px] text-[2.2rem] font-black text-[#556b2f]">
            The Benefits of Computer Science Tutoring
          </h1>
        </div>

        <figure className="mx-auto max-w-[800px]">
          <img
            className="mx-auto mt-[15px] block w-[90%] max-w-[800px] rounded-[10px] object-cover"
            src={ImageOne}
            alt="Students practicing chess on computers"
          />
          <figcaption className="mt-[5px] text-center text-[0.85rem] text-muted">
            Students practicing their chess skills in the classroom
          </figcaption>
        </figure>

        <div className={paragraphClasses}>
          <p>
            Computer science is a quickly growing field as technology becomes
            more and more ingrained in everyday life. Studying computer science
            lets students go into specialized careers and fields within STEM,
            and it also provides useful skills for many other jobs. With more
            work going remote and more jobs being automated, students will need
            to have digital skills for both in and out of the workplace.
          </p>
        </div>

        <div className={cn(paragraphClasses, "mt-[15px]")}>
          <p>
            Computer science has become fundamental to our lives, from the
            smartphones in our pockets to the computer you are reading this on.
            Learning more about how programming works and how apps are created,
            among the other topics of computer science, helps students
            understand the world as it is around them and make more informed
            choices. Skills such as online research, data analysis, and web
            programming are also becoming increasingly important and valuable.
            Learning about computer science will prepare students for their
            future.
          </p>
        </div>
      </section>
      <section className="flex min-h-[160px] items-center justify-center bg-[#c1dcaf] px-5 py-5" aria-label="Quote section" tabIndex={0}>
        <div className="max-w-[500px] text-center text-[1.2rem] font-bold leading-[1.7] text-dark">
          <p>
            "Women earn only eighteen percent of computer science degrees and
            Black and Latino students receive only twenty-two percent of college
            degrees in computer science"
          </p>
        </div>
      </section>
      <section className={sectionClasses} aria-label="CS benefit details section" tabIndex={0}>
        <div className={paragraphClasses}>
          <p>
            From an economic perspective, computer science is worthwhile and
            profitable to study. As this{" "}
            <span className="text-[#5584EC]">article</span> says, eight
            percent of students graduating from STEM are in computer science,
            but 58 percent of new jobs in STEM are in computer science. This
            makes it a promising field for young graduates to pursue. In terms
            of salary, a computer scientist can be expected to earn the national
            average salary of $99,050 according to this{" "}
            <span className="text-[#5584EC]">article</span>. The same article
            also adds that many programmers can expect to work remotely, and
            that about half of all programmers work remotely for a few days each
            month. This gives students going into computer science more options
            for jobs, as location is less of a problem than in other fields.
            Computer science opens up opportunities for students to explore and
            earn a living.
          </p>
        </div>

        <div className={cn(paragraphClasses, "mt-[15px]")}>
          <p>
            Tutoring for students in computer science can make a great
            difference. Starting early gives students an advantage in
            understanding programming. It’s especially important for students
            going into college to study computer science, as other students may
            already have some background or education in the field, as this{" "}
            <span className="text-[#5584EC]">article</span> notes. Providing
            support to underserved students is also important, as minority
            students and women can face unique challenges in STEM and computer
            science. As stated <span className="text-[#5584EC]">here</span>,
            women earn only eighteen percent of computer science degrees and
            Black and Latino students receive only twenty-two percent of college
            degrees in computer science. We need to reach out to these young and
            underserved students to help encourage and support them to learn and
            study computer science.
          </p>
        </div>

        <figure className="mx-auto max-w-[800px]">
          <img
            className="mx-auto mt-[15px] block h-[450px] w-[max(100%,300px)] object-contain"
            src={ImageTwo}
            alt="A student standing and holding a trophy alongside their mentor."
          />
          <figcaption className="mt-[5px] text-center text-[0.85rem] text-muted">
            A student with their mentor after winning an award.
          </figcaption>
        </figure>

        <div className={cn(paragraphClasses, "mt-[15px]")}>
          <p>
            Y STEM and Chess is dedicated to helping students rise out of
            poverty, and STEM gives students a pathway to earning a living and
            finding a career. As part of our programs, we offer tutoring in
            STEM, including computer science, math, and engineering, and it is
            free for students who cannot afford to pay. We provide classes in
            person in Boise and remotely across the country and the world.
            Washington, California, Texas, Florida, New York, and Oregon. To
            find more about our programs or discover how you can contribute,
            visit our website <span className="text-[#5584EC]">here</span>.
          </p>
        </div>
      </section>
    </main>
  );
};
export default CSBenefitPage;
