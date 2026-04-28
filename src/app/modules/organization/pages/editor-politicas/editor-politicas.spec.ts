import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorPoliticas } from './editor-politicas';

describe('EditorPoliticas', () => {
  let component: EditorPoliticas;
  let fixture: ComponentFixture<EditorPoliticas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorPoliticas],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorPoliticas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
