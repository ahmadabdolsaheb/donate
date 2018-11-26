import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isEmail from 'validator/lib/isEmail';

import CardForm from './CardForm';
import { injectStripe } from 'react-stripe-elements';
import { postJSON$ } from '../../../../utils/ajax-stream.js';
import { jwt } from '../../../redux/cookieVaules.js';

const propTypes = {
  email: PropTypes.string,
  renderCompletion: PropTypes.func.isRequired,
  stripe: PropTypes.shape({
    createToken: PropTypes.func.isRequired
  })
};
const initialSate = {
  donationAmount: 500,
  donationState: {
    processing: false,
    success: false,
    error: ''
  }
};

class DonateForm extends Component {
  constructor(...args) {
    super(...args);

    this.state = {
      ...initialSate,
      email: null
    };

    this.getUserEmail = this.getUserEmail.bind(this);
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.postDonation = this.postDonation.bind(this);
    this.resetDonation = this.resetDonation.bind(this);
  }

  handleEmailChange(e) {
    const newValue = e.target.value;
    return this.setState(state => ({
      ...state,
      email: newValue
    }));
  }

  handleSubmit() {
    const email = this.getUserEmail();
    if (!email || !isEmail(email)) {
      return this.setState(state => ({
        ...state,
        donationState: {
          ...state.donationState,
          error:
            'We need a valid email address to send your donation tax receipt to'
        }
      }));
    }
    return this.props.stripe.createToken({ email }).then(({ error, token }) => {
      if (error) {
        return this.setState(state => ({
          ...state,
          donationState: {
            ...state.donationState,
            error:
              'Something went wrong processing your donation. Your card' +
              ' has not been charged.'
          }
        }));
      }
      return this.postDonation(token);
    });
  }

  getUserEmail() {
    const { email: stateEmail } = this.state;
    const { email: propsEmail } = this.props;
    return stateEmail || propsEmail || '';
  }

  postDonation(token) {
    const { donationAmount: amount } = this.state;
    this.setState(state => ({
      ...state,
      donationState: {
        ...state.donationState,
        processing: true
      }
    }));
    const chargeStripePath = jwt
      ? '/external/donate/charge-stripe'
      : '/donate/charge-stripe';
    return postJSON$(chargeStripePath, {
      token,
      amount
    }).subscribe(
      res =>
        this.setState(state => ({
          ...state,
          donationState: {
            ...state.donationState,
            processing: false,
            success: true,
            error: res.error
          }
        })),
      err =>
        this.setState(state => ({
          ...state,
          donationState: {
            ...state.donationState,
            processing: false,
            success: false,
            error: err.error
          }
        }))
    );
  }

  renderDonateForm() {
    return (
      <div>
        <div className='text-center'>
          <p>
              freeCodeCamp.org is a tiny nonprofit that's helping millions
              of people learn to code for free.
              Join <strong>3,926</strong> supporters.
              Your $5 / month donation will help keep tech education
              free and open.
          </p>
        </div>
        {this.renderEmailInput()}
        <CardForm amount={5} handleSubmit={this.handleSubmit} />
      </div>
    );
  }

  renderEmailInput() {
    return (
      <div className='donation-email-container'>
        <label>
          Email (we'll send you a tax-deductible donation receipt):
          <input
            onChange={this.handleEmailChange}
            placeholder='email@example.com'
            required={true}
            type='email'
            value={this.getUserEmail()}
          />
        </label>
      </div>
    );
  }

  resetDonation() {
    return this.setState(() => initialSate);
  }

  render() {
    const { donationState: { processing, success, error } } = this.state;
    const { renderCompletion } = this.props;
    if (processing || success || error) {
      return renderCompletion({
        processing,
        success,
        error,
        reset: this.resetDonation
      });
    }
    return this.renderDonateForm();
  }
}

DonateForm.displayName = 'DonateForm';
DonateForm.propTypes = propTypes;

export default injectStripe(DonateForm);
