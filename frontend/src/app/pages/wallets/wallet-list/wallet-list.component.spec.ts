import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletListComponent } from './wallet-list.component';

describe('WalletListComponent', () => {
  let component: WalletListComponent;
  let fixture: ComponentFixture<WalletListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
