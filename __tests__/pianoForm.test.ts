import { makePiano, testUser } from "./helpers/fixtures";
import {
  createEmptyPianoForm,
  parsePianoForm,
  pianoFormProblem,
  PianoFormState,
  pianoToForm,
  toPianoEntryInput,
} from "@/utils/pianoForm";

const photo = { uri: "file:///cache/piano.jpg", fileSize: 1000 };

const completeForm = (changes: Partial<PianoFormState> = {}) => ({
  ...createEmptyPianoForm(),
  category: "warehouse",
  title: "Yamaha U1",
  description: "Upright piano",
  image: photo,
  make: "Yamaha",
  companyAssociated: "Shamshersons",
  ...changes,
});

describe("filling in a piano", () => {
  it("is complete with the basics for a warehouse piano", () => {
    expect(pianoFormProblem(completeForm())).toBeNull();
  });

  it.each([
    [{ category: "" }, "Please choose a category."],
    [{ image: null }, "Please add a photo."],
    [{ title: "   " }, "Please enter a title."],
    [{ description: "" }, "Please enter a description."],
    [{ make: "" }, "Please choose the make."],
    [{ companyAssociated: "" }, "Please choose the company."],
  ])("asks for what's missing (%p)", (changes, message) => {
    expect(pianoFormProblem(completeForm(changes))).toEqual({
      title: "Missing Details",
      message,
    });
  });

  it("doesn't need a new photo when the piano already has one", () => {
    expect(
      pianoFormProblem(completeForm({ image: null }), { hasSavedPhoto: true })
    ).toBeNull();
  });

  it("asks for each category's own details", () => {
    const problem = (changes: Partial<PianoFormState>) =>
      pianoFormProblem(completeForm(changes))?.message;

    expect(problem({ category: "rentable" })).toBe(
      "Please fill all rental details."
    );
    expect(problem({ category: "events" })).toBe(
      "Please fill all event details."
    );
    expect(problem({ category: "on_sale" })).toBe(
      "Please fill all sale details."
    );
  });

  it("checks the rental's mobile number and dates", () => {
    const rental = completeForm({
      category: "rentable",
      rentalCustomerName: "Asha Mehta",
      rentalCustomerAddress: "12 MG Road",
      rentalCustomerMobileNumber: "98765",
      rentalPrice: 4000,
      rentalStartDate: new Date(2026, 8, 1),
      rentalEndDate: new Date(2026, 11, 1),
    });

    expect(pianoFormProblem(rental)?.title).toBe("Check the rental details");
    expect(
      pianoFormProblem({ ...rental, rentalCustomerMobileNumber: "9876543210" })
    ).toBeNull();
  });
});

describe("saving a piano", () => {
  const user = { $id: "user-doc-1", accountId: "account-1" };

  it.each([
    [
      "rentable",
      {
        rental_customer_name: "Asha Mehta",
        rental_customer_address: "12 MG Road",
        rental_customer_mobile: "9876543210",
        rental_period_start: "2026-09-01",
        rental_period_end: "2026-12-01",
        rental_price: 4000,
      },
    ],
    ["warehouse", { warehouse_since_date: "2026-02-01" }],
    [
      "events",
      {
        event_purchase_price: 150000,
        event_purchase_from: "Delhi Music House",
        event_model_number: "U1",
        event_b_number: "B-778",
      },
    ],
    [
      "on_sale",
      {
        on_sale_purchase_from: "Kolkata Imports",
        on_sale_import_date: "2026-03-10",
        on_sale_price: 250000,
      },
    ],
  ])(
    "keeps every detail of a %s piano when it is edited",
    (category, details) => {
      const piano = makePiano({
        category,
        date_of_purchase: "2026-01-15" as any,
        ...(details as any),
      });

      const input = toPianoEntryInput(pianoToForm(piano), {
        user,
        image: piano.image_url,
      });

      expect(input).toEqual({
        users: "user-doc-1",
        creator: "account-1",
        category,
        make: piano.make,
        title: piano.title,
        description: piano.description,
        company_associated: piano.company_associated,
        image_url: piano.image_url,
        date_of_purchase: "2026-01-15",
        ...details,
      });
    }
  );

  it("sends a newly picked photo for upload", () => {
    const input = toPianoEntryInput(completeForm(), {
      user: { $id: testUser.$id, accountId: testUser.accountId },
      image: photo,
    });

    expect(input.image_url).toBe(photo);
  });
});

describe("passing a form between screens", () => {
  it("brings its dates back as dates", () => {
    const form = completeForm({ rentalEndDate: new Date(2026, 11, 1) });

    const parsed = parsePianoForm(JSON.stringify(form));

    expect(parsed.rentalEndDate).toBeInstanceOf(Date);
    expect(parsed.rentalEndDate.getTime()).toBe(form.rentalEndDate.getTime());
    expect(parsed.dateOfPurchase).toBeInstanceOf(Date);
    expect(parsed.title).toBe("Yamaha U1");
  });
});
