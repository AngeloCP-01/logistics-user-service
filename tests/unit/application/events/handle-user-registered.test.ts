import { HandleUserRegisteredUseCase } from "../../../../src/application/events/handle-user-registered.use-case.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { InMemoryUnitOfWork } from "../../fakes/in-memory-unit-of-work.js";
import { FixedClock } from "../../fakes/fixed-clock.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");
const EVENT_ID = "44444444-4444-7444-8444-444444444444";

function makeSut() {
  const uow = new InMemoryUnitOfWork();
  const clock = new FixedClock(NOW);
  return { uow, clock, sut: new HandleUserRegisteredUseCase(uow, clock) };
}

describe("HandleUserRegisteredUseCase", () => {
  it("creates customer profile only for role=customer", async () => {
    const { uow, sut } = makeSut();
    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, email: "alice@example.com", role: "customer" },
    });
    expect((await uow.customers.byUserId(USER_ID))?.displayName).toBe("alice");
    expect(await uow.drivers.byUserId(USER_ID)).toBeNull();
  });

  it("creates customer + driver rows for role=driver", async () => {
    const { uow, sut } = makeSut();
    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, email: "bob@example.com", role: "driver" },
    });
    expect(await uow.customers.byUserId(USER_ID)).not.toBeNull();
    const driver = await uow.drivers.byUserId(USER_ID);
    expect(driver).not.toBeNull();
    expect(driver!.profileComplete).toBe(false);
  });

  it("is idempotent on duplicate eventId", async () => {
    const { uow, sut } = makeSut();
    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, email: "alice@example.com", role: "customer" },
    });
    // Mutate the row to detect a second write
    const profile = (await uow.customers.byUserId(USER_ID))!;
    profile.updateProfile({ displayName: "Modified", phone: undefined, now: NOW });
    await uow.customers.save(profile);

    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, email: "alice@example.com", role: "customer" },
    });
    expect((await uow.customers.byUserId(USER_ID))?.displayName).toBe("Modified");
  });

  it("uses email local-part as display name", async () => {
    const { uow, sut } = makeSut();
    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, email: "alice.smith+tag@example.com", role: "customer" },
    });
    expect((await uow.customers.byUserId(USER_ID))?.displayName).toBe("alice.smith+tag");
  });
});
