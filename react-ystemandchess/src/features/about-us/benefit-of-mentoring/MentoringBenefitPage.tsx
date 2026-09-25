import React from "react";
import ImageOne from "../../../assets/images/mathArticle/computer.png";
import ImageTwo from "../../../assets/images/mathArticle/Junechamp 2.png";
import { cn } from "../../../core/utils/cn";

const sectionClasses = "bg-[#dff2c8] py-5";
const paragraphClasses = "mx-auto max-w-[800px] px-5 text-[1.05rem] leading-[1.7] text-dark text-justify";

const MentoringBenefitPage = () => {
  return (
    <main id="main-content-mentor" className="min-h-screen bg-[#dff2c8] font-sans text-dark" role="main">
      <section className={sectionClasses} aria-label="Main mentoring benefit section" tabIndex={0}>
        <div className="text-center">
          <h1 className="pt-[10px] text-[2.2rem] font-black text-[#556b2f]">The Benefits of Mentoring</h1>
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
            Mentors serve an important role in a student's growth, providing
            both encouragement and support. They are the examples that students
            follow to learn the kind of person they want to be when they step
            out into the world and become an adult. Oftentimes, mentors can be
            parents, teachers, or siblings, but tutors can also be important
            mentors for students. Because of the personal one-on-one sessions Y
            STEM and Chess provides, our tutors have a unique opportunity to
            become a valuable mentor to underserved students.
          </p>
        </div>

        <div className={cn(paragraphClasses, "mt-[15px]")}>
          <p>
            Underserved students are put at a disadvantage compared to those
            from more affluent neighborhoods when pursuing STEM careers. Poorer
            schools can lack laboratories, computers, or Internet access, most
            of which is invaluable in teaching STEM. Because of that, students
            can feel discouraged and like a career in STEM is permanently out of
            reach, especially for minority students. In this article from
            USNews, Captain Barrington recounts how his family, friends, and
            coaches disapproved of his decision to pursue aviation school rather
            than football, as football was seen as a way out of poverty. Many
            people who could find success are held back because they don't
            believe they can, and this is where a mentor and a role model can
            help shrink the gap between well-off students and underserved
            students.
          </p>
        </div>
      </section>
      <section className="flex min-h-[160px] items-center justify-center bg-[#c1dcaf] px-5 py-5" aria-label="Quote section" tabIndex={0}>
        <div className="max-w-[500px] text-center text-[1.2rem] font-bold leading-[1.7] text-dark">
          <p>
            "Mentors give students the chance to explore what they can do and
            what they want to do, and when it comes to mentoring, personalized
            attention is important"
          </p>
        </div>
      </section>
      <section className={sectionClasses} aria-label="Mentoring benefit details section" tabIndex={0}>
        <div className={paragraphClasses}>
          <p>
            STEM can seem like a challenging field to go into for minority
            students in particular. The same USNews article states that less
            than twenty percent of STEM students on college campuses are black
            and Latino, and in the workplace, it's less than five percent. Girls
            are also in need of mentoring, as STEM is also male-dominated. In
            2013, boys made up the majority of those taking AP Computer Science
            and AP Physics exams by a wide margin, as this article states. To
            close the racial and gender gap, efforts must be made to reach out
            to these students.
          </p>
        </div>

        <div className={cn(paragraphClasses, "mt-[15px]")}>
          <p>
            Mentors provide the encouragement and support that builds students'
            confidence. Mentors give students the chance to explore what they
            can do and what they want to do, and when it comes to mentoring,
            personalized attention is important. Teachers cannot mentor all of
            their students, especially with increasing amounts of classes and
            schools going remote and cutting students off from support systems.
            Mentors need to step in to fill the gap, and mentors have a
            measurable impact on the students they help. Underserved students
            with mentors are 55% more likely to go to college according to this
            article. With the help of mentoring and tutoring programs, more
            underserved students can go into STEM fields, breaking the cycle of
            poverty.
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
            Y STEM and Chess provides one-on-one mentoring sessions to help
            build students' personal skills, in addition to tutoring in STEM and
            chess. Mentors with Y STEM and Chess are background-checked, and
            they give personal guidance to students and help them grow. We
            provide classes in person in Boise and remotely across the country
            and the world. Washington, California, Texas, Florida, New York, and
            Oregon. We are ready to serve. For more details, please check our
            website to look at our programs and see how you can help with our
            mission.
          </p>
        </div>
      </section>
    </main>
  );
};
export default MentoringBenefitPage;
