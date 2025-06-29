import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoyaltyProgramsComponent } from './loyalty-programs.component';

describe('LoyaltyProgramsComponent', () => {
  let component: LoyaltyProgramsComponent;
  let fixture: ComponentFixture<LoyaltyProgramsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoyaltyProgramsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoyaltyProgramsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
